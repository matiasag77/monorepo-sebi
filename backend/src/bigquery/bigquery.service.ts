import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BigQuery } from '@google-cloud/bigquery';
import { GcpAuthService } from '../gcp-auth/gcp-auth.service';

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

  constructor(
    private readonly configService: ConfigService,
    private readonly gcpAuth: GcpAuthService,
  ) {
    this.datasetId = this.configService.get<string>('BIGQUERY_DATASET', 'test_logs');
    this.tableId = this.configService.get<string>('BIGQUERY_TABLE', 'web_test');
    this.enabled = !!this.configService.get<string>('BIGQUERY_PROJECT_ID');
  }

  async onModuleInit() {
    if (!this.enabled) {
      this.logger.warn('BigQuery is not configured (BIGQUERY_PROJECT_ID missing). Tracing disabled.');
      return;
    }

    const projectId = this.configService.get<string>('BIGQUERY_PROJECT_ID');
    const keyFilename = this.configService.get<string>('BIGQUERY_KEY_FILE');
    const credentialsJson = this.configService.get<string>('BIGQUERY_CREDENTIALS_JSON');

    const options: ConstructorParameters<typeof BigQuery>[0] = { projectId };

    if (this.gcpAuth.useWIF) {
      // Producción: WIF con AWS + K8s IRSA — delegado a GcpAuthService
      this.logger.log('Using GcpAuthService (WIF) for BigQuery authentication.');
      try {
        const authClient = await this.gcpAuth.getExternalAccountClient([
          'https://www.googleapis.com/auth/bigquery',
        ]);
        options.authClient = authClient;
        this.logger.log('ExternalAccountClient configured via GcpAuthService for BigQuery');
      } catch (error) {
        this.logger.error(`Error getting WIF client from GcpAuthService: ${error}`);
        this.logger.warn('Will attempt to use Application Default Credentials as fallback');
      }
    } else if (keyFilename) {
      options.keyFilename = keyFilename;
    } else if (credentialsJson) {
      try {
        options.credentials = JSON.parse(credentialsJson);
      } catch {
        this.logger.error('BIGQUERY_CREDENTIALS_JSON is not valid JSON. Falling back to ADC.');
      }
    }

    this.bigquery = new BigQuery(options);
    this.logger.log(`BigQuery initialized with projectId: ${projectId}`);

    await this.ensureDatasetAndTable();
  }

  private async ensureDatasetAndTable() {
    if (!this.bigquery) return;

    try {
      const [datasetExists] = await this.bigquery.dataset(this.datasetId).exists();
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
              { name: 'user_id', type: 'STRING', mode: 'NULLABLE' },
              { name: 'user_email', type: 'STRING', mode: 'NULLABLE' },
              { name: 'user_name', type: 'STRING', mode: 'NULLABLE' },
              { name: 'conversation_id', type: 'STRING', mode: 'NULLABLE' },
              { name: 'question', type: 'STRING', mode: 'NULLABLE' },
              { name: 'answer', type: 'STRING', mode: 'NULLABLE' },
              { name: 'timestamp', type: 'TIMESTAMP', mode: 'NULLABLE' },
            ],
          },
        });
        this.logger.log(`Table "${this.datasetId}.${this.tableId}" created.`);
      }

      this.logger.log('BigQuery tracing initialized successfully.');
    } catch (error) {
      this.logger.error(`Error initializing BigQuery: ${error}`);
    }
  }

  async insertConversationTrace(trace: ConversationTrace): Promise<void> {
    if (!this.bigquery) {
      this.logger.debug('BigQuery not configured, skipping trace insertion.');
      return;
    }

    try {
      const row = {
        user_id: trace.user_id || '',
        user_email: trace.user_email || '',
        user_name: trace.user_name || '',
        conversation_id: trace.conversation_id || '',
        question: trace.question || '',
        answer: trace.answer || '',
        timestamp: this.toBigQueryTimestamp(trace.timestamp),
      };

      this.logger.log(
        `Inserting trace for user ${row.user_email} in conversation ${row.conversation_id}...`,
      );

      await this.bigquery
        .dataset(this.datasetId)
        .table(this.tableId)
        .insert([row], {
          raw: false,
          skipInvalidRows: false,
          ignoreUnknownValues: false,
        });
      this.logger.log(
        `Trace inserted for user ${row.user_email} in conversation ${row.conversation_id}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Error inserting trace into BigQuery: ${error?.name || 'Unknown'} - ${error?.message || error}`,
      );

      if (error?.name === 'PartialFailureError' && error?.errors) {
        for (const rowError of error.errors) {
          this.logger.error(`Row error: ${JSON.stringify(rowError.errors)}`);
        }
      }
      if (error?.response?.insertErrors) {
        this.logger.error(`BigQuery insertErrors: ${JSON.stringify(error.response.insertErrors)}`);
      }
    }
  }

  private toBigQueryTimestamp(isoString: string): string {
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) {
        this.logger.warn(`Invalid timestamp "${isoString}", using current time`);
        return BigQuery.timestamp(new Date()).value;
      }
      return BigQuery.timestamp(date).value;
    } catch {
      this.logger.warn(`Error converting timestamp "${isoString}", using current time`);
      return BigQuery.timestamp(new Date()).value;
    }
  }
}
