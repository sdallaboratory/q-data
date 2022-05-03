// TODO: Remove this code

// import { APIMethods } from 'vk-io/lib/api/schemas/methods';

// async function call<
//     TArea extends keyof APIMethods,
//     TMethod extends keyof APIMethods[TArea],
//     >(
//         area: TArea,
//         method: TMethod,
//         params: Parameters<Extract<APIMethods[TArea][TMethod], (...args: any) => any>>[number],
// ) {
//     type TPromise = Extract<ReturnType<Extract<APIMethods[TArea][TMethod], (...args: any) => any>>, Promise<any>>;
//     type TResult = TPromise extends Promise<infer UResult> ? UResult : never;
//     // console.log('A job is added to the queue.');
//     return new Promise<TResult>(async (resolve, reject) => {
//         const job = await jobsQueue.add({ area, method, params });
//         try {
//             const response = await job.finished();
//             resolve(response);
//         } catch (e) {
//             reject(e);
//         } finally {
//             await job.remove();
//         }
//     });
// }

// export const api = {
//     call,
// };

// api.call('groups', 'search', { q: 'asdasda' });
