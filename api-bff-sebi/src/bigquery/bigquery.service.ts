import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';

export interface ConversationTrace {
  user_id: string;
  user_email: string;
  user_name: string;
  conversation_id: string;
  question: string;
  answer: string;
  timestamp: string;
}

@Injectable()
export class BigQueryService implements OnModuleInit {
  private readonly logger = new Logger(BigQueryService.name);
  private bigquery: BigQuery | null = null;
  private datasetId: string;
  private tableId: string;
  private enabled: boolean;

  constructor(private configService: ConfigService) {
    this.datasetId = this.configService.get<string>(
      'BIGQUERY_DATASET',
      'sebi_chatbot',
    );
    this.tableId = this.configService.get<string>(
      'BIGQUERY_TABLE',
      'conversation_traces',
    );
    this.enabled = !!this.configService.get<string>('BIGQUERY_PROJECT_ID');
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn(
        'BigQuery is not configured (BIGQUERY_PROJECT_ID missing). Tracing disabled.',
      );
      return;
    }

    const projectId = this.configService.get<string>('BIGQUERY_PROJECT_ID');
    const keyFilename = this.configService.get<string>(
      'BIGQUERY_KEY_FILE',
    );

    const options: ConstructorParameters<typeof BigQuery>[0] = { projectId };
    if (keyFilename) {
      options.keyFilename = keyFilename;
    }

    this.bigquery = new BigQuery(options);

    await this.ensureDatasetAndTable();
  }

  private async ensureDatasetAndTable() {
    if (!this.bigquery) return;

    try {
      const [datasetExists] = await this.bigquery
        .dataset(this.datasetId)
        .exists();
      if (!datasetExists) {
        await this.bigquery.createDataset(this.datasetId);
        this.logger.log(`Dataset "${this.datasetId}" created.`);
      }

      const [tableExists] = await this.bigquery
        .dataset(this.datasetId)
        .table(this.tableId)
        .exists();
      if (!tableExists) {
        await this.bigquery.dataset(this.datasetId).createTable(this.tableId, {
          schema: {
            fields: [
              { name: 'user_id', type: 'STRING', mode: 'REQUIRED' },
              { name: 'user_email', type: 'STRING', mode: 'REQUIRED' },
              { name: 'user_name', type: 'STRING', mode: 'REQUIRED' },
              { name: 'conversation_id', type: 'STRING', mode: 'REQUIRED' },
              { name: 'question', type: 'STRING', mode: 'REQUIRED' },
              { name: 'answer', type: 'STRING', mode: 'REQUIRED' },
              { name: 'timestamp', type: 'TIMESTAMP', mode: 'REQUIRED' },
            ],
          },
        });
        this.logger.log(
          `Table "${this.datasetId}.${this.tableId}" created.`,
        );
      }

      this.logger.log('BigQuery tracing initialized successfully.');
    } catch (error) {
      this.logger.error(`Error initializing BigQuery: ${error}`);
    }
  }

  async insertConversationTrace(trace: ConversationTrace): Promise<void> {
    if (!this.bigquery) {
      this.logger.debug(
        'BigQuery not configured, skipping trace insertion.',
      );
      return;
    }

    try {
      await this.bigquery
        .dataset(this.datasetId)
        .table(this.tableId)
        .insert([trace]);
      this.logger.debug(
        `Trace inserted for user ${trace.user_email} in conversation ${trace.conversation_id}`,
      );
    } catch (error) {
      this.logger.error(`Error inserting trace into BigQuery: ${error}`);
    }
  }
}
