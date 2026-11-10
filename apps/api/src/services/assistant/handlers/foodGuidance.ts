import {FoodGuidanceService} from '../../recommendations/FoodGuidanceService.js';
import type {ToolHandler,ToolExecutionContext} from './types.js';

export class ReadFoodGuidanceHandler implements ToolHandler<{focus?:string}> {
 constructor(private readonly service=new FoodGuidanceService()){}
 async execute(ctx:ToolExecutionContext,args:{focus?:string}){
  return {result:await this.service.read(ctx.userId,ctx.userClient,{focus:args.focus})};
 }
}
