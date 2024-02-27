## Descreption

- nats-storage-service as class, which is responsible for interfacing with NATS JetStream for model operations, including model creation, updating, deletion, and data manipulation within models.


## Usage
- create .env file in the root directory of your project and add following content:
```bash
NATS_URL = nats://localhost:4222
```
- to install package
```bash
npm install https://github.com/HossamGeek/nats-storage-service#main

```
- In app.module
```bash
import { NatsStorageModule } from 'nats-storage-service';

@Module({
  imports: [
    // ... other modules here
    NatsStorageModule.forRoot(process.env.NATS_URL)
  ]
})
export class AppModule {}

```
- in any class  where you want to use NATS Storage Service, import it like this:
```bash
import { NatsBaseModel } from 'nats-storage-service';

@Injectable()
export class Service{
    constructor(
        private readonly natsBase: NatsBaseModel
    ){}
    // use methods from NatsBaseModel
    }
```

## NatsBaseModel Method:
```bash
    // Method Response Structure  
    NatsExecutionModel{
       code:number; 
       msg?:string;   
       err?:any; 
    }
    NatsExecutionKV {
      code:number; 
       msg?:string;   
       err?:any; 
       value?:any;
      seq?:any;
    }

    // Methods
    // create new model instance in the data store
    createModel(modelName:string,numOfIndexes?:Number):Promise<NatsExecutionModel>; 

    // update model instance in the data store
    updateModel(modelName:string,numOfIndexes?:Number):Promise<NatsExecutionModel>;
    
    // delete model instance in the data store
    dropModel(modelName:string):Promise<NatsExecutionModel>; 
    
    // find instance in the data store
    findOneExistRow(modelName:string,...args:Array<any>):Promise<NatsExecutionKV>; 
    
    // delete instance in the data store by filter index and data
    deleteExistRow(modelName:string,...args:Array<string>):Promise<NatsExecutionKV>; 

    // insert new row in to the model
    insertNewRow(modelName:string,data:Uint8Array,...args:Array<any>):Promise<NatsExecutionKV>;

    // update exist row in the model
    updateExistRow(modelName:string,data:Uint8Array,...args:Array<any>):Promise<NatsExecutionKV>;
    
    // get all rows name from model
    getAllRowsNameFromModel(modelName:string,...args:Array<string>):Promise<NatsExecutionKV>; 
    
    // get all values from model by rows name
    getAllValuesFromModelByRowsName(rowsName:Array<string>):Promise<NatsExecutionKV>; 
    
    // get subject name recorded by model name
    getSubjectNameRecordedbyModelName(modelName: string): Promise<NatsExecutionKV>
    
    // get last subject from the stream
    getLastSubject(modelName: string): Promise<NatsExecutionKV>; 

    ----- KEYS ----
    upsertSection(keyName: string, data: Uint8Array,): Promise<NatsExecutionKV>;// upsert KV data
    getSectionsKeys(): Promise<NatsExecutionKV>;// get all keys
    getSectionsValues(): Promise<NatsExecutionKV>; // get all values
    deleteSection(keyName: string): Promise<NatsExecutionKV>; // delete KV data by key Name
    forceDeleteSection(keyName: string): Promise<NatsExecutionKV>; // force delete KV data by key Name
    getWorkingSection(keyName: string): Promise<NatsExecutionKV>; // get working Key
    getSection(keyName: string): Promise<NatsExecutionKV>; // get last version number and value for specific key modified
    getSectionByVersion(keyName: string,version: number,): Promise<NatsExecutionKV>; // get specific key value by version modified
    getHistoricSection(keyName: string): Promise<NatsExecutionKV>; // get historic of modified specific section
    destroyNatsBucket(): Promise<void>; // destroy Nats Bucket and keys values

```


## Nats Serialization Method:
```bash
  /**
   * Serializes the given data into a Uint8Array.
   *
   * @param {any} data - the data to be serialized
   * @return {Uint8Array} the serialized Uint8Array
   */
  
  serialization(data: any): Uint8Array

  /**
    * Deserialize the given Uint8Array data to an object.
    *
    * @param {Uint8Array} data - The data to be deserialized
    * @return {object} The deserialized object
    */

    deserialization(data: Uint8Array): object 
```


## For How to use it check 

- check NatsBaseModel.spec.ts file  for more examples of how to use this class.

## Running the Tests
- install docker in your machine and run the following command in your terminal :
```bash
$ docker compose up
```
- To execute the tests, run the following command in your terminal:
```bash
npm test
```
