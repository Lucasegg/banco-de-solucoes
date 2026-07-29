import type { ContentReport } from '../../types/contentReport.ts';
type ListResult={ok:true;data:ContentReport[]}|{ok:false;message:string};
export type MyReportsLoader={listMine():Promise<ListResult>};
export type MyReportsLoadState={loading:false;items:ContentReport[];error:string};
export async function loadMyContentReports(repository:MyReportsLoader|null,unavailableMessage:string):Promise<MyReportsLoadState>{if(!repository)return{loading:false,items:[],error:unavailableMessage};const result=await repository.listMine();return result.ok?{loading:false,items:result.data,error:''}:{loading:false,items:[],error:result.message};}
