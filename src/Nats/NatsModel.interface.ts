import { NatsExecutionKV, NatsExecutionModel } from './NatsResponseValues';

export default interface NatsModel {
  createModel(
    modelName: string,
    numOfIndexes?: number,
  ): Promise<NatsExecutionModel>;
  updateModel(
    modelName: string,
    numOfIndexes?: number,
  ): Promise<NatsExecutionModel>;
  dropModel(modelName: string): Promise<NatsExecutionModel>;
  findOneExistRow(
    modelName: string,
    ...args: Array<any>
  ): Promise<NatsExecutionKV>;
  deleteExistRow(
    modelName: string,
    ...args: Array<string>
  ): Promise<NatsExecutionKV>;
  insertNewRow(
    modelName: string,
    data: Uint8Array,
    ...args: Array<any>
  ): Promise<NatsExecutionKV>;
  updateExistRow(
    modelName: string,
    data: Uint8Array,
    ...args: Array<any>
  ): Promise<NatsExecutionKV>;
  getAllRowsNameFromModel(
    modelName: string,
    ...args: Array<string>
  ): Promise<NatsExecutionKV>;
  getAllValuesFromModelByRowsName(
    rowsName: Array<string>,
  ): Promise<NatsExecutionKV>;
  getSubjectNameRecordedbyModelName(
    modelName: string,
  ): Promise<NatsExecutionKV>;
  getLastSubject(modelName: string): Promise<NatsExecutionKV>;
  upsertSection(keyName: string, data: Uint8Array): Promise<NatsExecutionKV>;
  getSectionsKeys(): Promise<NatsExecutionKV>;
  getSectionsValues(): Promise<NatsExecutionKV>;
  deleteSection(keyName: string): Promise<NatsExecutionKV>;
  forceDeleteSection(keyName: string): Promise<NatsExecutionKV>;
  getWorkingSection(keyName: string): Promise<NatsExecutionKV>;
  getSection(keyName: string): Promise<NatsExecutionKV>;
  getSectionByVersion(
    keyName: string,
    version: number,
  ): Promise<NatsExecutionKV>;
  getHistoricSection(keyName: string): Promise<NatsExecutionKV>;
  destroyNatsBucket(): Promise<void>;
}
