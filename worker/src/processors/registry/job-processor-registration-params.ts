import { TaskName } from '../../../../shared/models/tasks/task-name';

export interface JobProcessorRegistrationParams {
    taskName: TaskName;
    defaultParams: unknown; // TODO: Add generic typings
}
