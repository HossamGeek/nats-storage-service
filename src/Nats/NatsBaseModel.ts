import { Inject, Injectable } from '@nestjs/common';
import { ClientNats } from '@nestjs/microservices';
import {
  JetStreamManager,
  StreamConfig,
  NatsError,
  JetStreamClient,
  RetentionPolicy,
  StorageType,
  DiscardPolicy,
  StreamAPI,
  createInbox,
  AckPolicy,
  JetStreamSubscription,
  KV,
  KvEntry,
  QueuedIterator,
  ConsumerOptsBuilder,
  ConsumerOpts,
} from 'nats';
import NatsModel from './NatsModel.interface';
import {
  NatsExecutionError,
  NatsExecutionKV,
  NatsExecutionModel,
} from './NatsResponseValues';
import { NatsResponseCode } from './NatsResponseCode';
import { spawn } from 'child_process';
import { Observable, from } from 'rxjs';
import { NatsResponseMsg } from './errors/Nats.enum.errors';

@Injectable()
export default class NatsBaseModel implements NatsModel {
  private NatsModelConfiguration: StreamConfig = {
    first_seq: 0,
    retention: RetentionPolicy.Limits,
    max_bytes: 1024 * 1024 * 100,
    max_age: 0,
    storage: StorageType.File,
    name: '',
    max_consumers: 0,
    sealed: false,
    subjects: [],
    max_msgs_per_subject: 0,
    max_msgs: 0,
    max_msg_size: 0,
    discard: DiscardPolicy.Old,
    discard_new_per_subject: false,
    duplicate_window: 0,
    allow_rollup_hdrs: false,
    num_replicas: 0,
    deny_delete: false,
    deny_purge: false,
    allow_direct: false,
    mirror_direct: false,
  };

  private natsClientConnect: Promise<any>;
  constructor(
    @Inject('NATS_SERVICE') private readonly natsClient: ClientNats,
  ) {}

  /**
   * Retrieves and returns the connection to the NatsClient.
   *
   * @return {Promise<any>} The connection to the NatsClient.
   */
  private async getNatsClientConnect(): Promise<any> {
    this.natsClientConnect = await this.natsClient.connect();
    return this.natsClientConnect;
  }
  /**
   * Retrieves the JetStreamManager asynchronously.
   *
   * @return {Promise<JetStreamManager>} A promise that resolves to the JetStreamManager.
   */
  private async getJetStreamManager(): Promise<JetStreamManager> {
    return (await this.getNatsClientConnect()).jetstreamManager();
  }
  /**
   * Retrieves the StreamAPI by asynchronously getting the JetStreamManager and accessing the streams property.
   *
   * @return {Promise<StreamAPI>} A promise that resolves to the StreamAPI.
   */
  private async getJetStreamClient(): Promise<JetStreamClient> {
    return (await this.getNatsClientConnect()).jetstream();
  }
  /**
   * Retrieves the StreamAPI by calling the getJetStreamManager method and accessing the streams property.
   *
   * @return {Promise<StreamAPI>} A Promise that resolves to the StreamAPI object.
   */
  private async getStreamApi(): Promise<StreamAPI> {
    return (await this.getJetStreamManager()).streams;
  }

  private handleNatsError(error: NatsError | any): NatsExecutionError {
    const errCode = error.api_error ? error.api_error.err_code : 0;
    if (errCode && NatsResponseCode[errCode]) return NatsResponseCode[errCode];
    else if (error.message) {
      switch (error.message) {
        case NatsResponseMsg.Connection:
          return NatsResponseCode[500];
        case NatsResponseMsg.Invalid:
          return NatsResponseCode[2022];
        case NatsResponseMsg.Max_Payload:
          return NatsResponseCode[2022];
        default:
          return { code: 404, err: error };
      }
    } else return { code: 404, err: error };
  }

  private getIndexesOfRowName(rowName: string): Array<string> {
    if (typeof rowName !== 'string')
      throw new Error('Invalid rowName parameter: must be a string');
    if (rowName.length >= 1) return rowName.split('.');
    return [''];
  }

  private getRowName(modelName: string, ...args: Array<string>): string {
    return `${modelName}.${args
      .map((arg) => {
        arg = typeof arg == 'number' ? arg : arg.replace(/[ .]/g, '@');
        return arg;
      })
      .filter(Boolean)
      .join('.')}`;
  }

  private invalidModelName(modelName: string): NatsExecutionModel {
    if (
      !modelName ||
      typeof modelName !== 'string' ||
      modelName.trim().length === 0 ||
      /[#$%^&><*.!]/.test(modelName)
    ) {
      return NatsResponseCode[2012];
    }
    return { code: 2000 };
  }

  private filterationBy(
    numOfIndexToByFilter: number,
    ...args: Array<string>
  ): Array<string> {
    const maskedArray = Array.from({ length: args.length }, (_, index) =>
      index < numOfIndexToByFilter ? args[index] : '*',
    );
    return maskedArray;
  }
  /**
   *  Returns the subject of the given model name.
   * @param {string} modelName The model name to get the subject of.
   * @returns {Promise<string>} A Promise that resolves to the subject of the given model name.
   * @throws {Error} - Throws an error if the modelName parameter is invalid.
   * */
  async getSubjectNameRecordedbyModelName(
    modelName: string,
  ): Promise<NatsExecutionKV> {
    if (this.invalidModelName(modelName).code == 2012)
      return this.invalidModelName(modelName);
    try {
      const subject = (await (await this.getStreamApi()).info(modelName)).config
        .subjects;
      if (subject.length)
        return { ...NatsResponseCode[2023], value: subject[0] };
      return { ...NatsResponseCode[10059], value: '' };
    } catch (error) {
      return this.handleNatsError(error);
    }
  }
  async getLastSubject(modelName: string): Promise<NatsExecutionKV> {
    try {
      if (this.invalidModelName(modelName).code == 2012)
        return this.invalidModelName(modelName);
      const lastSeq = (await (await this.getStreamApi()).info(modelName)).state
        .last_seq;
      if (lastSeq == 0) return { ...NatsResponseCode[2009] };
      const msg = await (
        await this.getStreamApi()
      ).getMessage(modelName, { seq: lastSeq });
      return { ...NatsResponseCode[2007], value: msg.subject, seq: msg.seq };
    } catch (error) {
      return this.handleNatsError(error);
    }
  }

  async findModel(modelName: string): Promise<NatsExecutionModel> {
    // Input validation
    if (this.invalidModelName(modelName).code == 2012)
      return this.invalidModelName(modelName);

    try {
      // const subject = `${modelName}.${'*.'.repeat(numOfIndexes)}`.slice(0, -1);
      const getModel = await (await this.getStreamApi()).info(modelName);
      if (getModel.config.name) return NatsResponseCode[2014];
    } catch (error) {
      return this.handleNatsError(error);
    }
  }
  /**
   * Creates a new NatsExecutionModel with the given model name and number of indexes.
   * @param {string} modelName - The name of the model. Must be a non-empty string.
   * @param {number} [numOfIndexes=1] - The number of indexes to create. Must be a positive integer.
   * @returns {Promise<NatsExecutionModel>} - A Promise that resolves to the created NatsExecutionModel object.
   * @throws {Error} - Throws an error if the modelName or numOfIndexes parameters are invalid.
   */
  async createModel(
    modelName: string,
    numOfIndexes: number = 15,
  ): Promise<NatsExecutionModel> {
    // Input validation
    if (this.invalidModelName(modelName).code == 2012)
      return this.invalidModelName(modelName);

    if (!Number.isInteger(numOfIndexes) || numOfIndexes < 1) {
      return NatsResponseCode[2013];
    }

    try {
      const subject = `${modelName}.${'*.'.repeat(numOfIndexes)}`.slice(0, -1);
      if ((await this.findModel(modelName)).code == 2014)
        return NatsResponseCode[2015];
      const addModel = await (
        await this.getStreamApi()
      ).add({
        ...this.NatsModelConfiguration,
        name: modelName,
        subjects: [subject],
      } as Partial<StreamConfig>);
      if (addModel.config.name) return NatsResponseCode[2001];
    } catch (error) {
      return this.handleNatsError(error);
    }
  }
  /**
   * Updates an existing Model with the specified model name and number of indexes.
   *
   * @async
   * @param {string} modelName - The name of the model to update. Must be a non-empty string.
   * @param {number} [numOfIndexes=1] - The number of indexes to update. Must be a positive integer.
   * @returns {Promise<NatsExecutionModel>} - A Promise that resolves to the updated NatsExecutionModel object.
   * @throws {Error} - If the modelName or numOfIndexes parameters are invalid or an error occurs while updating the model.
   */
  async updateModel(
    modelName: string,
    numOfIndexes: number = 1,
  ): Promise<NatsExecutionModel> {
    if (this.invalidModelName(modelName).code == 2012)
      return this.invalidModelName(modelName);

    if (!Number.isInteger(numOfIndexes) || numOfIndexes < 1) {
      return NatsResponseCode[2013];
    }
    try {
      if ((await this.findModel(modelName)).code != 2014)
        return NatsResponseCode[10059];
      const subject = `${modelName}.${'*.'.repeat(numOfIndexes)}`.slice(0, -1);
      const updateModel = await (
        await this.getStreamApi()
      ).update(modelName, {
        ...this.NatsModelConfiguration,
        name: modelName,
        subjects: [subject],
      } as Partial<StreamConfig>);
      if (updateModel.config.name) return NatsResponseCode[2003];
    } catch (error) {
      return this.handleNatsError(error);
    }
  }
  /**
   * Deletes a JetStream model with the given name
   * @param modelName The name of the model to delete
   * @returns A Promise containing a NatsExecutionModel object indicating success or failure
   */
  async dropModel(modelName: string): Promise<NatsExecutionModel> {
    try {
      if (this.invalidModelName(modelName).code == 2012)
        return this.invalidModelName(modelName);
      const streamInfo = await (
        await this.getJetStreamManager()
      ).streams.info(modelName);
      if (!streamInfo) return NatsResponseCode[10059];
      await (await this.getStreamApi()).delete(modelName);
      return NatsResponseCode[2002];
    } catch (error) {
      return this.handleNatsError(error);
    }
  }

  /**
   * Find a specific message in a given stream by subject (row name) and return its data and sequence number.
   * @param modelName The name of the stream to search in.
   *  @param args The subject (row name) to search for.
   * @returns An object containing the code 2007 and the data and sequence number of the found message if successful, or an object with the error code and message if unsuccessful.
   */
  async findOneExistRow(
    modelName: string,
    ...args: Array<any>
  ): Promise<NatsExecutionKV> {
    // Validate inputs
    if (this.invalidModelName(modelName).code == 2012)
      return this.invalidModelName(modelName);

    try {
      const rowName: string = this.getRowName(modelName, ...args);
      const subject = await this.getSubjectNameRecordedbyModelName(modelName);
      if (subject.code == 10059) return { ...NatsResponseCode[10059] };
      const getSubjectName = subject.value;
      if (
        this.getIndexesOfRowName(rowName).length ===
        this.getIndexesOfRowName(getSubjectName).length
      ) {
        //    why two await? and there is await in getStreamApi
        const msg = await (
          await this.getStreamApi()
        ).getMessage(modelName, { last_by_subj: rowName });
        // console.log("🚀 ~ file: NatsBaseModel.ts:206 ~ NatsBaseModel ~ findOneExistRow ~ msg:", msg)
        return { ...NatsResponseCode[2007], value: msg.data, seq: msg.seq };
      }
      return NatsResponseCode[2017];
      /**
       * method is not guaranteed to return a message, so you should consider
       * adding a timeout to prevent
       *  the function from waiting indefinitely for a message that may never arrive.
       */
      // const timeout = setTimeout(() => {
      //     throw new Error('Timeout: getMessage method took too long to return');
      // }, 5000);

      // Clear the timeout
      //    clearTimeout(timeout);
    } catch (error) {
      // Handle error
      if (error instanceof Error && error.message.startsWith('Timeout')) {
        return { code: 408, msg: error.message };
      }
      return this.handleNatsError(error);
    }
  }
  /**
   * Delete a specific message in a given stream by subject (row name) and sequence number.
   * @param modelName The name of the stream to delete from.
   * @param args The subject (row names) to search for.
   * @returns An object containing the code 200 and a message indicating success, or an object with the error code and message if unsuccessful.
   */
  // need to change function name to be specific to deleteRow or deleteMessage
  async deleteExistRow(
    modelName: string,
    ...args: Array<string>
  ): Promise<NatsExecutionKV> {
    try {
      // Validate input parameters
      if (this.invalidModelName(modelName).code == 2012)
        return this.invalidModelName(modelName);

      const { code, seq, err, msg } = await this.findOneExistRow(
        modelName,
        ...args,
      );
      if (code == 2007) {
        const isDeleted = await (
          await this.getStreamApi()
        ).deleteMessage(modelName, seq, true);
        if (isDeleted) return NatsResponseCode[2005];
        else return NatsResponseCode[2020];
      }
      return { code, err, msg };
    } catch (error) {
      return this.handleNatsError(error);
    }
  }
  /**
   * Inserts data into the specified NATS stream.
   *
   * @param {string} modelName - The name of the NATS stream.
   * @param {Uint8Array} data - The data to insert into the stream.
   * @param {string} args - The subject (cols names) to insert the data into.
   * @returns {Promise<NatsExecutionKV>} - A promise that resolves to a NATS execution key value object.
   * @throws {Error} - Throws an error if the input parameters are invalid or if an error occurs during the insertion process.
   */
  async insertNewRow(
    modelName: string,
    data: Uint8Array,
    ...args: Array<any>
  ): Promise<NatsExecutionKV> {
    try {
      // Validate input parameters
      if (this.invalidModelName(modelName).code == 2012)
        return this.invalidModelName(modelName);
      if (!(data instanceof Uint8Array)) return NatsResponseCode[2016];

      const rowName: string = this.getRowName(modelName, ...args);
      const subject = await this.getSubjectNameRecordedbyModelName(modelName);
      if (subject.code == 10059) return { ...NatsResponseCode[10059] };
      const getSubjectName = subject.value;
      if (
        this.getIndexesOfRowName(rowName).length ==
        this.getIndexesOfRowName(getSubjectName).length
      ) {
        const { code, err, msg } = await this.findOneExistRow(
          modelName,
          ...args,
        );
        if (code == 10037) {
          await (await this.getJetStreamClient()).publish(rowName, data);
          return NatsResponseCode[2004];
        }
        if (code == 2007) return NatsResponseCode[2019];
        return { code, err, msg };
      }
      return NatsResponseCode[2017];
    } catch (error) {
      return this.handleNatsError(error);
    }
  }

  /**
   * Updates the data of an existing message in the specified NATS stream by deleting the old message and inserting the updated one.
   *
   * @param {string} modelName - The name of the NATS stream.
   * @param {Uint8Array} data - The updated data to insert into the stream.
   * @param {string} args - The subject (cols names) to update the data in.
   * @returns {Promise<NatsExecutionKV>} - A promise that resolves to a NATS execution key value object.
   * @throws {Error} - Throws an error if the input parameters are invalid or if an error occurs during the update process.
   */
  // function name better to be updateRow or updateMessage more specific
  async updateExistRow(
    modelName: string,
    data: Uint8Array,
    ...args: Array<any>
  ): Promise<NatsExecutionKV> {
    try {
      // Validate input parameters
      if (this.invalidModelName(modelName).code == 2012)
        return this.invalidModelName(modelName);
      if (!(data instanceof Uint8Array)) return NatsResponseCode[2016];

      const { code, err, msg } = await this.deleteExistRow(modelName, ...args);
      if (code == 2005) {
        const updateData = await this.insertNewRow(modelName, data, ...args);
        if (updateData.code == 2004) return NatsResponseCode[2006];
      }
      return { code, err, msg };
    } catch (error) {
      return this.handleNatsError(error);
    }
  }
  /**
   * get all rows name from model
   * @param modelName
   * @param args subject (col names) to search for.
   * @returns {Promise<NatsExecutionKV>} - A promise that resolves to a NATS execution key value object.
   */
  /**
   * @fix This function is not working properly
   */
  async getAllRowsNameFromModel(
    modelName: string,
    ...args: Array<string>
  ): Promise<NatsExecutionKV> {
    //console.log("🚀 ~ file: NatsBaseModel.ts:316 ~ NatsBaseModel ~ getAllRowsNameFromModel ~ modelName: string, ...args: Array<string>:", modelName, args)
    if (this.invalidModelName(modelName).code == 2012)
      return this.invalidModelName(modelName);

    try {
      const rowName: Array<string> = this.getIndexesOfRowName(
        this.getRowName(modelName, ...args),
      );

      const subject = await this.getSubjectNameRecordedbyModelName(modelName);
      if (subject.code == 10059) return { ...NatsResponseCode[10059] };
      const getSubjectName: Array<string> = this.getIndexesOfRowName(
        subject.value,
      );
      if (rowName.length <= getSubjectName.length) {
        getSubjectName.splice(0, rowName.length, ...rowName);
        const rowsFilter: string = getSubjectName.join('.');
        //console.log('rowsFilter', rowsFilter);

        const subjects = (
          await (
            await this.getStreamApi()
          ).info(modelName, { subjects_filter: rowsFilter })
        ).state.subjects;
        //console.log("subjects", subjects);

        if (!subjects) return NatsResponseCode[2009];
        return { ...NatsResponseCode[2008], value: Object.keys(subjects) };
      }
      return NatsResponseCode[2017];
    } catch (error) {
      return this.handleNatsError(error);
    }
  }

  /**
   *  Get all rows name from model by rows name
   * @param rowNames
   * @returns {Promise<NatsExecutionKV>} - A promise that resolves to a NATS execution key value object.
   * @throws {Error} - Throws an error if the input parameters are invalid or if an error occurs during the update process.
   */
  /**
   * @fix This function is not working properly
   */
  async getAllValuesFromModelByRowsName(
    rowsName: Array<string>,
  ): Promise<NatsExecutionKV> {
    if (!rowsName.length) return NatsResponseCode[2018];
    const successData: Array<{ rowName: string; value: Uint8Array }> = [],
      errorData: Array<{ rowName: string; error: any; msg: string }> = [];
    for (const rowName of rowsName) {
      const setRowNameToArray: Array<string> = rowName.split('.');
      const modelName: string = setRowNameToArray[0];
      setRowNameToArray.shift();
      const { code, value, err, msg } = await this.findOneExistRow(
        modelName,
        ...setRowNameToArray,
      );
      //console.log("value", value, "err", err, "msg", msg);

      if (code != 2007) errorData.push({ rowName, error: err, msg });
      else successData.push({ rowName, value });
    }

    return { ...NatsResponseCode[2021], value: { successData, errorData } };
  }
  // ===========>

  private async streamView(streamName, page = 1, pageSize = 10): Promise<any> {
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    return new Promise((resolve, reject) => {
      const process = spawn('nats', ['stream', 'view', streamName]);
      let output = '';
      process.stdout.on('data', (data) => {
        output += data.toString();
      });
      process.on('error', (error) => {
        reject(error);
      });
      process.on('close', () => {
        const messages = output
          .split('\n')
          .filter(Boolean)
          .slice(startIndex, endIndex);
        const parsedMessages = messages
          .map((message) => {
            try {
              console.log('message=====>', message);
              if (!message.startsWith('{')) {
                return null;
              }
              const parsedMessage = JSON.parse(message);
              return parsedMessage;
            } catch (error) {
              console.error(`Error parsing message: ${message}`, error);
              return null;
            }
          })
          .filter(Boolean);
        resolve(parsedMessages);
      });
    });
  }

  async subscribeModel(
    subjectName: string,
    consumeName: string,
  ): Promise<JetStreamSubscription> {
    const config: ConsumerOptsBuilder | Partial<ConsumerOpts> = {
      mack: true, //manaul ack
      config: {
        durable_name: consumeName, //unique consume name
        ack_policy: AckPolicy.Explicit,
        deliver_subject: createInbox(),
      },
    };
    return (await this.getJetStreamClient()).subscribe(subjectName, config);
  }

  /***** KEYS *** KEYS **** KEYS ******/ /***** KEYS *** KEYS **** KEYS ******/ /***** KEYS *** KEYS **** KEYS ******/
  /***** KEYS *** KEYS **** KEYS ******/ /***** KEYS *** KEYS **** KEYS ******/ /***** KEYS *** KEYS **** KEYS ******/

  private async getNatsBucket(): Promise<KV> {
    return (await this.getJetStreamClient()).views.kv('NatsBucket', {
      history: 9999 * 9999,
      storage: StorageType.File,
    });
  }

  //add new section
  async upsertSection(
    keyName: string,
    data: Uint8Array,
  ): Promise<NatsExecutionKV> {
    if (this.invalidModelName(keyName).code == 2012)
      return NatsResponseCode[2025];
    if (!(data instanceof Uint8Array)) return NatsResponseCode[2016];
    try {
      const key = await this.getNatsBucket();
      //check if not exist  create new section with values
      if (!(await key.get(keyName))) await key.create(keyName, data);
      // else  //update values
      else await key.put(keyName, data);
      const kValue: KvEntry = await key.get(keyName);
      return {
        ...NatsResponseCode[2007],
        value: kValue.value as Uint8Array,
        seq: kValue.revision,
      };
    } catch (error) {
      return this.handleNatsError(error);
    }
  }
  // get setcions with Values
  private async executeGetSectionsKeys(): Promise<
    Observable<QueuedIterator<string>>
  > {
    const pickASection = await this.getNatsBucket();
    return from(pickASection.keys());
  }

  async getSectionsKeys(): Promise<NatsExecutionKV> {
    try {
      const keys: Array<string> = [];
      return new Promise(async (resolve) => {
        (await this.executeGetSectionsKeys()).subscribe({
          async next(value: QueuedIterator<string>) {
            for await (const KV of value) {
              keys.push(KV);
            }
            if (keys.length)
              resolve({ ...NatsResponseCode[2008], value: keys });
            else resolve(NatsResponseCode[2009]);
          },
        });
      });
    } catch (error) {
      return this.handleNatsError(error);
    }
  }
  async getSectionsValues(): Promise<NatsExecutionKV> {
    try {
      const { code, err, msg, value = [] } = await this.getSectionsKeys();
      if (!value && !value.length) return { code, msg, err };
      const pickASection = await this.getNatsBucket();
      const buffer: Array<{ value: Uint8Array; key: string }> = [];
      for await (const key of value) {
        const value = (await pickASection.get(key)).value;
        buffer.push({ key, value });
      }
      if (buffer.length) return { ...NatsResponseCode[2008], value: buffer };
      return { ...NatsResponseCode[2009] };
    } catch (error) {
      return this.handleNatsError(error);
    }
  }
  //delete specific section
  async deleteSection(keyName: string): Promise<NatsExecutionKV> {
    if (this.invalidModelName(keyName).code == 2012)
      return NatsResponseCode[2025];
    try {
      const pickASection = await this.getNatsBucket();
      if (
        (await pickASection.get(keyName)) &&
        (await pickASection.get(keyName)).operation != 'DEL'
      ) {
        await pickASection.delete(keyName);
        return { ...NatsResponseCode[2005] };
      }
      return { ...NatsResponseCode[2010] };
    } catch (error) {
      return this.handleNatsError(error);
    }
  }

  //hard delete specific section
  async forceDeleteSection(keyName: string): Promise<NatsExecutionKV> {
    if (this.invalidModelName(keyName).code == 2012)
      return NatsResponseCode[2025];
    try {
      const pickASection = await this.getNatsBucket();
      if (
        (await pickASection.get(keyName)) &&
        (await pickASection.get(keyName)).operation != 'PURGE'
      ) {
        await pickASection.purge(keyName);
        return { ...NatsResponseCode[2005] };
      }
      return { ...NatsResponseCode[2010] };
    } catch (error) {
      return this.handleNatsError(error);
    }
  }

  //get Actually working section
  async getWorkingSection(keyName: string): Promise<NatsExecutionKV> {
    if (this.invalidModelName(keyName).code == 2012)
      return NatsResponseCode[2025];
    try {
      const pickASection = await this.getNatsBucket();
      const kValue: KvEntry = await pickASection.get(keyName);
      if (kValue && kValue.operation == 'PUT')
        return {
          ...NatsResponseCode[2007],
          value: kValue.value,
          seq: kValue.revision,
        };
      return { ...NatsResponseCode[2010] };
    } catch (error) {
      return this.handleNatsError(error);
    }
  }

  // get historic of modified specific section
  //1-get last version number and value for specific section modified
  async getSection(keyName: string): Promise<NatsExecutionKV> {
    if (this.invalidModelName(keyName).code == 2012)
      return NatsResponseCode[2025];

    try {
      const pickASection = await this.getNatsBucket();
      const kValue: KvEntry = await pickASection.get(keyName);
      if (kValue)
        return {
          ...NatsResponseCode[2007],
          value: kValue.value,
          seq: kValue.revision,
        };
      return { ...NatsResponseCode[2010] };
    } catch (error) {
      return this.handleNatsError(error);
    }
  }
  //2-get specific section value by version modified
  async getSectionByVersion(
    keyName: string,
    version: number,
  ): Promise<NatsExecutionKV> {
    if (this.invalidModelName(keyName).code == 2012)
      return NatsResponseCode[2025];
    if (typeof version != 'number' || version <= 0)
      return NatsResponseCode[2026];
    try {
      const pickASection = await this.getNatsBucket();
      const kValue: KvEntry = await pickASection.get(keyName, {
        revision: version,
      });
      if (kValue)
        return {
          ...NatsResponseCode[2007],
          value: kValue.value,
          seq: kValue.revision,
        };
      return { ...NatsResponseCode[2010] };
    } catch (error) {
      return this.handleNatsError(error);
    }
  }
  //2-get all modified version number and values for specific key name
  private async executeHistorySection(
    keyName: string,
  ): Promise<Observable<QueuedIterator<KvEntry>>> {
    const pickASection = await this.getNatsBucket();
    return from(pickASection.history({ key: keyName }));
  }
  async getHistoricSection(keyName: string): Promise<NatsExecutionKV> {
    if (this.invalidModelName(keyName).code == 2012)
      return NatsResponseCode[2025];
    try {
      const buffer: Array<{
        value: Uint8Array;
        version: number;
        createdAt: Date;
        operation: string;
      }> = [];
      return new Promise(async (resolve) => {
        (await this.executeHistorySection(keyName)).subscribe({
          async next(value: QueuedIterator<KvEntry>) {
            for await (const KV of value) {
              const { value, operation, created, revision } = KV;
              buffer.push({
                value,
                operation,
                createdAt: created,
                version: revision,
              });
            }
            if (buffer.length)
              resolve({ ...NatsResponseCode[2011], value: buffer });
            else resolve({ ...NatsResponseCode[2010] });
          },
        });
      });
    } catch (error) {
      return this.handleNatsError(error);
    }
  }

  async destroyNatsBucket(): Promise<void> {
    await (await this.getNatsBucket()).destroy();
  }

  // async  streamView(streamName:string) {
  //   return new Promise((resolve, reject) => {
  //     const process = spawn('nats', ['stream', 'view', streamName]);
  //     let output = '';
  //     process.stdout.on('data', (data) => {
  //       output += data.toString();
  //     });
  //     process.on('error', (error) => {
  //       reject(error);
  //     });
  //     process.on('close', () => {
  //       const messages = output.split('\n').filter(Boolean);
  //       console.log("mess",messages)

  //       resolve(messages);
  //     });
  //   });
  // }
}
