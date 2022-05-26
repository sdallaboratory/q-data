import { Job, Worker } from 'bullmq';
import { ObjectId } from 'mongodb';
import { environment } from '../../../shared/environment';
import { Disposable } from '../../../shared/interfaces/disposable';
import { log } from '../../../shared/logger/log';
import { MongoService } from '../services/mongo.service';
import { JobProcessor } from './job-processor';

/**
 * You should implements this class to create a Processor with useful databse utilities.
 * 
 * Processor syntactically is a class with async `process` function which get's jobs data.
 * 
 * Basic class provides several useful utility properties and methods.
 */
export abstract class JobDbProcessor<TJob extends Job = Job> extends JobProcessor<TJob> {

    constructor(
        protected readonly job: TJob,
        protected readonly mongo: MongoService,
    ) {
        super();
    }

    protected async save<T extends object>(
        docs: T[],
        { collection, db, ordered }: { collection?: string, db?: string, ordered?: boolean } = {}
    ) {
        // TODO:
        db = db ?? this.params.mongo.db;
        const collectionName = collection ?? this.params.mongo.collection ?? this.job.name + (Math.random() * 1000000).toFixed(0);
        const client = await this.mongo.client;
        const col = client.db(db).collection(collectionName);
        const preparedDocs = docs
            .map(d => this.stampId(d))
            .map(d => this.stampMeta(d));
        return col.insertMany(preparedDocs, { ordered }).then(() => collectionName);
    }

}