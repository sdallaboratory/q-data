import { Job } from 'bullmq';
import { MongoClient } from 'mongodb';
import { injectable, scoped, Lifecycle, inject } from 'tsyringe';
import { environment } from '../../../shared/environment';
import { Disposable } from '../../../shared/interfaces/disposable';

@injectable()
@scoped(Lifecycle.ResolutionScoped)
export class MongoService implements Disposable {

    constructor(
        @inject(Job) protected readonly job: Job,
    ) {}

    public readonly client = new MongoClient(
        environment.MONGO_CONNECTION_STRING // TODO: Check if job.data.mongo.connection exists
    ).connect();

    public async getClient() {
        return await this.client;
    }

    // TODO: Maybe reduce strings to literal types
    public async getDb(db: string) {
        const client = await this.client;
        return client.db(db);
    }
    public async getCollection<TDocument>(db: string, collection: string) {
        const client = await this.client;
        return client.db(db).collection<TDocument>(collection);
    }

    async dispose() {
        const client = await this.client;
        client.close();
    }

}