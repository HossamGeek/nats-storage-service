import { NatsResponseCode } from './NatsResponseCode';
import NatsBaseModel from './NatsBaseModel';
import { Test, TestingModule } from '@nestjs/testing';
import { ClientsModule, Transport } from '@nestjs/microservices';

describe('NatsBaseModel', () => {
  let natsExecutionModel: NatsBaseModel;
  const modelName = 'TestModel';
  const sectionName = 'TestSection';
  const unFoundModelName = modelName + '1';
  const numOfIndexes = 15;
  const fIndex = '1';
  const sIndex = 'CREATED';
  const tIndex = 'Bazoka';
  const data = new TextEncoder().encode(
    JSON.stringify({
      fIndex,
      sIndex,
      tIndex,
    }),
  );
  const sectionData = new TextEncoder().encode(JSON.stringify(['item1']));

  const indexes = (...args: Array<string>) =>
    Array.from({ length: numOfIndexes }, (_, index) =>
      args[index] ? args[index] : 'null',
    );
  const succesArgs = indexes(...[fIndex, sIndex, tIndex]);
  const failArgs = indexes(...['2', sIndex, tIndex]);
  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ClientsModule.register([
          {
            name: 'NATS_SERVICE',
            transport: Transport.NATS,
            options: {
              servers: [process.env.NATS_URL || 'nats://localhost:4222'],
            },
          },
        ]),
      ],
      providers: [NatsBaseModel],
    }).compile();

    natsExecutionModel = module.get<NatsBaseModel>(NatsBaseModel);
    const result = await natsExecutionModel.getLastSubject('ITEM');
    if (result.code == 500) {
      console.error('Test failed cause of Nats connection failed:', result);
      process.exit(1);
    }
  });

  it('should be defined', () => {
    expect(natsExecutionModel).toBeDefined();
  });

  describe('createModel : create new model instance in the data store', () => {
    it('should return 2012 an error with an empty modelName parameter ', async () => {
      const modelName = '';
      const result = await natsExecutionModel.createModel(
        modelName,
        numOfIndexes,
      );
      expect(result).toEqual(NatsResponseCode[2012]);
    });
    it('should return 2013 an error with an invalid numOfIndexes parameter ', async () => {
      const numOfIndexes = -3;
      const result = await natsExecutionModel.createModel(
        modelName,
        numOfIndexes,
      );
      expect(result).toEqual(NatsResponseCode[2013]);
    });
    it('should return 2012 an error with a modelName is Contain Special Char parameter', async () => {
      const modelName = 'Test.Model';
      const result = await natsExecutionModel.createModel(
        modelName,
        numOfIndexes,
      );
      expect(result).toEqual(NatsResponseCode[2012]);
    });
    it('should return 2022 an error with numOfIndexes length Max payload', async () => {
      const numOfIndexes = 99999999;
      const result = await natsExecutionModel.createModel(
        modelName,
        numOfIndexes,
      );
      expect(result).toEqual(NatsResponseCode[2022]);
    });

    it('should return 2001 create a model with valid arguments', async () => {
      // Act
      const result = await natsExecutionModel.createModel(
        modelName,
        numOfIndexes,
      );
      // Assert
      expect(result).toBe(NatsResponseCode[2001]);
    });
    it('should return 2015 an error with an duplicate modelName  ', async () => {
      const result = await natsExecutionModel.createModel(
        modelName,
        numOfIndexes,
      );
      expect(result).toEqual(NatsResponseCode[2015]);
    });
    it('should return 2015 an error with an add a different configuration  ', async () => {
      const numOfIndexes = 16;
      const result = await natsExecutionModel.createModel(
        modelName,
        numOfIndexes,
      );
      expect(result).toEqual(NatsResponseCode[2015]);
    });

    afterAll(async () => {
      await natsExecutionModel.dropModel(modelName);
    });
  });

  describe('updateModel : update model instance in the data store', () => {
    it('should return 10059 an error if model not found', async () => {
      const response = await natsExecutionModel.updateModel(
        modelName,
        numOfIndexes,
      );
      expect(response).toEqual(NatsResponseCode[10059]);
    });

    describe('if model found', () => {
      const updateIndexes = 17;
      beforeAll(async () => {
        // create model
        await natsExecutionModel.createModel(modelName, numOfIndexes);
      });
      it('should return 2022 an error with numOfIndexes length Max payload  ', async () => {
        const numOfIndexes = 99999999;
        const result = await natsExecutionModel.updateModel(
          modelName,
          numOfIndexes,
        );
        expect(result).toEqual(NatsResponseCode[2022]);
      });

      it('should return 2003 update a model with valid arguments', async () => {
        // Act
        const result = await natsExecutionModel.updateModel(
          modelName,
          updateIndexes,
        );
        // Assert
        expect(result).toBe(NatsResponseCode[2003]);
      });
      it('should return 2012 an error with an empty modelName parameter ', async () => {
        const modelName = '';
        const result = await natsExecutionModel.updateModel(
          modelName,
          updateIndexes,
        );
        expect(result).toEqual(NatsResponseCode[2012]);
      });
      it('should return 2013 an error with an invalid numOfIndexes parameter ', async () => {
        const numOfIndexes = -3;
        const result = await natsExecutionModel.updateModel(
          modelName,
          numOfIndexes,
        );
        expect(result).toEqual(NatsResponseCode[2013]);
      });
      it('should return 2012 an error with a modelName is Contain Special Char parameter', async () => {
        const modelName = 'Test.Model';
        const result = await natsExecutionModel.updateModel(
          modelName,
          numOfIndexes,
        );
        expect(result).toEqual(NatsResponseCode[2012]);
      });

      afterAll(async () => {
        await natsExecutionModel.dropModel(modelName);
      });
    });
  });

  describe('dropModel : delete model instance in the data store', () => {
    it('should return 10059 an error if model not found', async () => {
      const response = await natsExecutionModel.dropModel(modelName);
      expect(response).toEqual(NatsResponseCode[10059]);
    });
    describe('if model found', () => {
      beforeAll(async () => {
        // create model
        await natsExecutionModel.createModel(modelName, numOfIndexes);
      });
      it('should return 2012 an error with an empty modelName parameter ', async () => {
        const modelName = '';
        const result = await natsExecutionModel.dropModel(modelName);
        expect(result).toEqual(NatsResponseCode[2012]);
      });
      it('should return 2012 an error with a modelName is Contain Special Char parameter', async () => {
        const modelName = 'Test.Model';
        const result = await natsExecutionModel.dropModel(modelName);
        expect(result).toEqual(NatsResponseCode[2012]);
      });
      it('should return 2002 for delete Model', async () => {
        // Act
        const result = await natsExecutionModel.dropModel(modelName);
        // Assert
        expect(result).toBe(NatsResponseCode[2002]);
      });
    });
  });

  describe('findOneExistRow : find instance in the data store', () => {
    beforeAll(async () => {
      // create model
      await natsExecutionModel.createModel(modelName, numOfIndexes);
      await natsExecutionModel.insertNewRow(modelName, data, ...succesArgs);
    });

    it('should return 2007 find one with valid arguments ', async () => {
      const response = await natsExecutionModel.findOneExistRow(
        modelName,
        ...succesArgs,
      );
      expect(response).toStrictEqual({
        ...NatsResponseCode[2007],
        seq: response.seq,
        value: response.value,
      });
    });
    it('should find one with invalid arguments and return 10037', async () => {
      const response = await natsExecutionModel.findOneExistRow(
        modelName,
        ...failArgs,
      );
      expect(response).toBe(NatsResponseCode[10037]);
    });
    it('should return 2012 an error with an empty modelName parameter ', async () => {
      const modelName = '';
      const result = await natsExecutionModel.findOneExistRow(
        modelName,
        ...succesArgs,
      );
      expect(result).toEqual(NatsResponseCode[2012]);
    });
    it('should return 2017 an error with an if ...args are not the same num of indexes of the Model ', async () => {
      const result = await natsExecutionModel.findOneExistRow(
        modelName,
        fIndex,
        sIndex,
      );
      expect(result).toEqual(NatsResponseCode[2017]);
    });
    it('should return 2012 an error with a modelName is Contain Special Char parameter ', async () => {
      const modelName = 'Test.Model';
      const result = await natsExecutionModel.findOneExistRow(
        modelName,
        ...succesArgs,
      );
      expect(result).toEqual(NatsResponseCode[2012]);
    });
    it('should return 10059 an error if model not found', async () => {
      const response = await natsExecutionModel.findOneExistRow(
        modelName + '1',
        ...succesArgs,
      );
      expect(response).toEqual(NatsResponseCode[10059]);
    });
    afterAll(async () => {
      await natsExecutionModel.dropModel(modelName);
    });
  });

  describe('deleteExistRow : delete instance in the data store by filter index and data', () => {
    beforeAll(async () => {
      // create model
      await natsExecutionModel.createModel(modelName, numOfIndexes);
      await natsExecutionModel.insertNewRow(modelName, data, ...succesArgs);
    });

    it('should return 2005 find one with valid arguments and success deleted ', async () => {
      const response = await natsExecutionModel.deleteExistRow(
        modelName,
        ...succesArgs,
      );
      expect(response).toEqual(NatsResponseCode[2005]);
    });
    it('should find one and not found will return 10037', async () => {
      const response = await natsExecutionModel.deleteExistRow(
        modelName,
        ...failArgs,
      );
      expect(response).toEqual(NatsResponseCode[10037]);
    });
    it('should return 2012 an error with an empty modelName parameter ', async () => {
      const modelName = '';
      const result = await natsExecutionModel.deleteExistRow(
        modelName,
        ...succesArgs,
      );
      expect(result).toEqual(NatsResponseCode[2012]);
    });
    it('should return 2017 an error with an if ...args are not the same num of indexes of the Model ', async () => {
      const result = await natsExecutionModel.deleteExistRow(
        modelName,
        fIndex,
        sIndex,
      );
      expect(result).toEqual(NatsResponseCode[2017]);
    });
    it('should return 2012 an error with a modelName is Contain Special Char parameter ', async () => {
      const modelName = 'Test.Model';
      const result = await natsExecutionModel.deleteExistRow(
        modelName,
        ...succesArgs,
      );
      expect(result).toEqual(NatsResponseCode[2012]);
    });
    it('should return 10059 an error if model not found', async () => {
      const response = await natsExecutionModel.deleteExistRow(
        unFoundModelName,
        ...succesArgs,
      );
      expect(response).toEqual(NatsResponseCode[10059]);
    });
    afterAll(async () => {
      await natsExecutionModel.dropModel(modelName);
    });
  });

  describe('getLastSubject : get last subject from the stream', () => {
    beforeAll(async () => {
      // create model
      await natsExecutionModel.createModel(modelName, numOfIndexes);
    });
    it('should return 2012 an error with an empty modelName parameter ', async () => {
      const modelName = '';
      const result = await natsExecutionModel.getLastSubject(modelName);
      expect(result).toEqual(NatsResponseCode[2012]);
    });
    it('should return 2009 an error with no rows saved in model ', async () => {
      const result = await natsExecutionModel.getLastSubject(modelName);
      expect(result).toEqual(NatsResponseCode[2009]);
    });
    it('should return 2012 an error with a modelName is Contain Special Char parameter ', async () => {
      const modelName = 'Test.Model';
      const result = await natsExecutionModel.getLastSubject(modelName);
      expect(result).toEqual(NatsResponseCode[2012]);
    });
    describe('is success and will get last subject and seq ', () => {
      beforeAll(async () => {
        // create model
        await natsExecutionModel.insertNewRow(modelName, data, ...succesArgs);
      });
      it('should return 2007 and get last subject and seq ', async () => {
        const result = await natsExecutionModel.getLastSubject(modelName);
        expect(typeof result.value).toBe('string');
        expect(typeof result.seq).toBe('number');
        expect(result.value).toEqual(modelName + '.' + succesArgs.join('.'));
        expect(result.value.split('.').length).toBe(16);
        expect(result.seq).toEqual(1);
        expect(result).toEqual({
          ...NatsResponseCode[2007],
          value: result.value,
          seq: result.seq,
        });
      });
    });
    it('should return 10059 an error if model not found', async () => {
      const response =
        await natsExecutionModel.getLastSubject(unFoundModelName);
      expect(response).toEqual(NatsResponseCode[10059]);
    });
    afterAll(async () => {
      await natsExecutionModel.dropModel(modelName);
    });
  });

  describe('insertNewRow : insert new row in to the model', () => {
    beforeAll(async () => {
      // create model
      await natsExecutionModel.createModel(modelName, numOfIndexes);
    });
    it('should return 2004 an success data inserted ', async () => {
      const result = await natsExecutionModel.insertNewRow(
        modelName,
        data,
        ...succesArgs,
      );
      expect(result).toEqual(NatsResponseCode[2004]);
    });
    it('should return 2019 invalid arguments to find before insert ', async () => {
      const response = await natsExecutionModel.insertNewRow(
        modelName,
        data,
        ...succesArgs,
      );
      expect(response).toBe(NatsResponseCode[2019]);
    });
    it('should return 2012 an error with an empty modelName parameter ', async () => {
      const modelName = '';
      const result = await natsExecutionModel.insertNewRow(
        modelName,
        data,
        ...succesArgs,
      );
      expect(result).toEqual(NatsResponseCode[2012]);
    });
    it('should return 2017 an error with an if ...args are not the same num of indexes of the Model ', async () => {
      const result = await natsExecutionModel.insertNewRow(
        modelName,
        data,
        fIndex,
        sIndex,
      );
      expect(result).toEqual(NatsResponseCode[2017]);
    });
    it('should return 2012 an error with a modelName is Contain Special Char parameter ', async () => {
      const modelName = 'Test.Model';
      const result = await natsExecutionModel.insertNewRow(
        modelName,
        data,
        ...succesArgs,
      );
      expect(result).toEqual(NatsResponseCode[2012]);
    });
    it('should return 10059 an error if model not found', async () => {
      const response = await natsExecutionModel.insertNewRow(
        unFoundModelName,
        data,
        ...succesArgs,
      );
      expect(response).toEqual(NatsResponseCode[10059]);
    });

    afterAll(async () => {
      await natsExecutionModel.dropModel(modelName);
    });
  });

  describe('getAllRowsNameFromModel : get all rows name from model', () => {
    beforeAll(async () => {
      // create model
      await natsExecutionModel.createModel(modelName, numOfIndexes);
    });
    describe('if not insert data ', () => {
      it('should return 2012 an error with an empty modelName parameter ', async () => {
        const modelName = '';
        const result = await natsExecutionModel.getAllRowsNameFromModel(
          modelName,
          ...succesArgs,
        );
        expect(result).toEqual(NatsResponseCode[2012]);
      });
      it('should return 2009 an error with an if ...args are not the same num of indexes of the Model ', async () => {
        const result = await natsExecutionModel.getAllRowsNameFromModel(
          modelName,
          fIndex,
          sIndex,
        );
        expect(result).toEqual(NatsResponseCode[2009]);
      });
      it('should return 2012 an error with a modelName is Contain Special Char parameter ', async () => {
        const modelName = 'Test.Model';
        const result = await natsExecutionModel.getAllRowsNameFromModel(
          modelName,
          ...succesArgs,
        );
        expect(result).toEqual(NatsResponseCode[2012]);
      });
      it('should return 2009 an error with no rows found ', async () => {
        const result = await natsExecutionModel.getAllRowsNameFromModel(
          modelName,
          ...succesArgs,
        );
        expect(result).toEqual(NatsResponseCode[2009]);
      });
      it('should return 10059 an error if model not found', async () => {
        const response = await natsExecutionModel.getAllRowsNameFromModel(
          unFoundModelName,
          ...succesArgs,
        );
        expect(response).toEqual(NatsResponseCode[10059]);
      });
    });

    describe('if insert data to test to get all rowsName is inserted', () => {
      beforeAll(async () => {
        // create model
        await natsExecutionModel.insertNewRow(
          modelName,
          data,
          ...indexes(...['1', sIndex, tIndex]),
        );
        await natsExecutionModel.insertNewRow(
          modelName,
          data,
          ...indexes(...['2', sIndex, tIndex]),
        );
        await natsExecutionModel.insertNewRow(
          modelName,
          data,
          ...indexes(...['3', sIndex, tIndex]),
        );
      });

      it('should return 2008 find one with valid arguments ', async () => {
        const response = await natsExecutionModel.getAllRowsNameFromModel(
          modelName,
          ...indexes(...['*', sIndex, '*']),
        );
        expect(response.value.length).toBe(3);
        expect(response.value).toStrictEqual([
          'TestModel.1.CREATED.Bazoka.null.null.null.null.null.null.null.null.null.null.null.null',
          'TestModel.2.CREATED.Bazoka.null.null.null.null.null.null.null.null.null.null.null.null',
          'TestModel.3.CREATED.Bazoka.null.null.null.null.null.null.null.null.null.null.null.null',
        ]);
        expect(response).toStrictEqual({
          ...NatsResponseCode[2008],
          value: response.value,
        });
      });
    });

    afterAll(async () => {
      await natsExecutionModel.dropModel(modelName);
    });
  });

  describe('getAllValuesFromModelByRowsName : get all values from model by rows name', () => {
    beforeAll(async () => {
      // create model
      await natsExecutionModel.createModel(modelName, numOfIndexes);
    });
    describe('if not insert data ', () => {
      it('should return 2018 an error with an empty rowsName ', async () => {
        const result = await natsExecutionModel.getAllValuesFromModelByRowsName(
          [],
        );
        expect(result).toEqual(NatsResponseCode[2018]);
      });
    });
    describe('if insert data ', () => {
      beforeAll(async () => {
        // create model
        await natsExecutionModel.insertNewRow(
          modelName,
          data,
          ...indexes(...['1', sIndex, tIndex]),
        );
        await natsExecutionModel.insertNewRow(
          modelName,
          data,
          ...indexes(...['2', sIndex, tIndex]),
        );
        await natsExecutionModel.insertNewRow(
          modelName,
          data,
          ...indexes(...['3', sIndex, tIndex]),
        );
      });
      it('should return 2012 an error with an empty modelName parameter ', async () => {
        const result = await natsExecutionModel.getAllValuesFromModelByRowsName(
          [
            'TestModel.1.CREATED.Bazoka.null.null.null.null.null.null.null.null.null.null.null.null',
            'TestModel.2.CREATED.Bazoka.null.null.null.null.null.null.null.null.null.null.null.null',
            'TestModel.3.CREATED.Bazoka.null.null.null.null.null.null.null.null.null.null.null.null',
            'TestModel.4.CREATED.Bazoka.null.null.null.null.null.null.null.null.null.null.null.null',
          ],
        );
        expect(result.value.successData.length).toBe(3);
        expect(result.value.errorData.length).toBe(1);
        expect(result.value.successData).toStrictEqual([
          {
            rowName:
              'TestModel.1.CREATED.Bazoka.null.null.null.null.null.null.null.null.null.null.null.null',
            value: data,
          },
          {
            rowName:
              'TestModel.2.CREATED.Bazoka.null.null.null.null.null.null.null.null.null.null.null.null',
            value: data,
          },
          {
            rowName:
              'TestModel.3.CREATED.Bazoka.null.null.null.null.null.null.null.null.null.null.null.null',
            value: data,
          },
        ]);
        expect(result.value.errorData).toEqual([
          {
            rowName:
              'TestModel.4.CREATED.Bazoka.null.null.null.null.null.null.null.null.null.null.null.null',
            msg: 'no message found',
          },
        ]);
        expect(result).toEqual({
          ...NatsResponseCode[2021],
          value: {
            successData: result.value.successData,
            errorData: result.value.errorData,
          },
        });
      });
    });
    afterAll(async () => {
      await natsExecutionModel.dropModel(modelName);
    });
  });

  describe('getSubjectNameRecordedbyModelName : get subject name recorded by model name', () => {
    it('should return 2012 an error with an empty modelName parameter ', async () => {
      const modelName = '';
      const result =
        await natsExecutionModel.getSubjectNameRecordedbyModelName(modelName);
      expect(result).toEqual(NatsResponseCode[2012]);
    });
    it('should return 2012 an error with a modelName is Contain Special Char parameter ', async () => {
      const modelName = 'Test.Model';
      const result =
        await natsExecutionModel.getAllRowsNameFromModel(modelName);
      expect(result).toEqual(NatsResponseCode[2012]);
    });
    it('should return 10059 an error with no subject found ', async () => {
      const result =
        await natsExecutionModel.getSubjectNameRecordedbyModelName(modelName);
      expect(result).toEqual(NatsResponseCode[10059]);
    });

    describe('if model inserted', () => {
      beforeAll(async () => {
        await natsExecutionModel.createModel(modelName, numOfIndexes);
      });
      it('should return 2023 for subject is found ', async () => {
        const result =
          await natsExecutionModel.getSubjectNameRecordedbyModelName(modelName);
        expect(result).toEqual({
          ...NatsResponseCode[2023],
          value: result.value,
        });
        expect(result.value).toEqual(modelName + '.*'.repeat(15));
      });

      afterAll(async () => {
        await natsExecutionModel.dropModel(modelName);
      });
    });
  });

  describe('upsertSection : upsert KV data ', () => {
    it('should return 2025 an error with an empty sectionName parameter ', async () => {
      const sectionName = '';
      const result = await natsExecutionModel.upsertSection(
        sectionName,
        sectionData,
      );
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2025 an error with a sectionName is Contain Special Char parameter ', async () => {
      const sectionName = 'Section.Model';
      const result = await natsExecutionModel.upsertSection(
        sectionName,
        sectionData,
      );
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2007  if key is found and data is insert', async () => {
      const response = await natsExecutionModel.upsertSection(
        sectionName,
        sectionData,
      );
      expect(response).toEqual({
        ...NatsResponseCode[2007],
        value: response.value,
        seq: 1,
      });
    });

    afterAll(async () => {
      await natsExecutionModel.destroyNatsBucket();
    });
  });

  describe('getSectionsKeys : get all keys', () => {
    it('should return 2009  if no keys found', async () => {
      const response = await natsExecutionModel.getSectionsKeys();
      expect(response).toEqual({ ...NatsResponseCode[2009] });
    });
    describe('if inserted key', () => {
      beforeAll(async () => {
        await natsExecutionModel.upsertSection(sectionName, sectionData);
      });
      it('should return 2008  if keys found', async () => {
        const response = await natsExecutionModel.getSectionsKeys();
        expect(response).toEqual({
          ...NatsResponseCode[2008],
          value: ['TestSection'],
        });
      });
      afterAll(async () => {
        await natsExecutionModel.destroyNatsBucket();
      });
    });
  });

  describe('getSectionsValues : get all values', () => {
    it('should return 2009  if no keys found', async () => {
      const response = await natsExecutionModel.getSectionsValues();
      expect(response).toEqual({ ...NatsResponseCode[2009] });
    });
    describe('if inserted key', () => {
      beforeAll(async () => {
        await natsExecutionModel.upsertSection(sectionName, sectionData);
      });
      it('should return 2008  if keys and  values found ', async () => {
        const response = await natsExecutionModel.getSectionsValues();
        expect(response).toEqual({
          ...NatsResponseCode[2008],
          value: [
            {
              key: 'TestSection',
              value: response.value[0]?.value,
            },
          ],
        });
      });
      afterAll(async () => {
        await natsExecutionModel.destroyNatsBucket();
      });
    });
  });

  describe('deleteSection : delete KV data by key Name', () => {
    it('should return 2025 an error with an empty sectionName parameter ', async () => {
      const sectionName = '';
      const result = await natsExecutionModel.deleteSection(sectionName);
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2025 an error with a sectionName is Contain Special Char parameter ', async () => {
      const sectionName = 'Section.Model';
      const result = await natsExecutionModel.deleteSection(sectionName);
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2010  if key is not found ', async () => {
      const response = await natsExecutionModel.deleteSection(sectionName);
      expect(response).toEqual({ ...NatsResponseCode[2010] });
    });

    describe('if inserted key', () => {
      beforeAll(async () => {
        await natsExecutionModel.upsertSection(sectionName, sectionData);
      });
      it('should return 2005  if keys is deleted ', async () => {
        const response = await natsExecutionModel.deleteSection(sectionName);
        expect(response).toEqual({ ...NatsResponseCode[2005] });
      });
      afterAll(async () => {
        await natsExecutionModel.destroyNatsBucket();
      });
    });
  });

  describe('forceDeleteSection : delete KV data by key Name ', () => {
    it('should return 2025 an error with an empty sectionName parameter ', async () => {
      const sectionName = '';
      const result = await natsExecutionModel.forceDeleteSection(sectionName);
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2025 an error with a sectionName is Contain Special Char parameter ', async () => {
      const sectionName = 'Section.Model';
      const result = await natsExecutionModel.forceDeleteSection(sectionName);
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2010  if key is not found ', async () => {
      const response = await natsExecutionModel.forceDeleteSection(sectionName);
      expect(response).toEqual({ ...NatsResponseCode[2010] });
    });

    describe('if inserted key', () => {
      beforeAll(async () => {
        await natsExecutionModel.upsertSection(sectionName, sectionData);
      });
      it('should return 2005  if keys is deleted ', async () => {
        const response =
          await natsExecutionModel.forceDeleteSection(sectionName);
        expect(response).toEqual({ ...NatsResponseCode[2005] });
      });
      afterAll(async () => {
        await natsExecutionModel.destroyNatsBucket();
      });
    });
  });

  describe('getWorkingSection : get working Key', () => {
    it('should return 2025 an error with an empty sectionName parameter ', async () => {
      const sectionName = '';
      const result = await natsExecutionModel.getWorkingSection(sectionName);
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2025 an error with a sectionName is Contain Special Char parameter ', async () => {
      const sectionName = 'Section.Model';
      const result = await natsExecutionModel.getWorkingSection(sectionName);
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2010  if key is not found ', async () => {
      const response = await natsExecutionModel.getWorkingSection(sectionName);
      expect(response).toEqual({ ...NatsResponseCode[2010] });
    });

    describe('if inserted key', () => {
      beforeAll(async () => {
        await natsExecutionModel.upsertSection(sectionName, sectionData);
      });
      it('should return 2007  if keys is found ', async () => {
        const response =
          await natsExecutionModel.getWorkingSection(sectionName);
        expect(response).toEqual({
          ...NatsResponseCode[2007],
          value: response.value,
          seq: 1,
        });
      });
      afterAll(async () => {
        await natsExecutionModel.destroyNatsBucket();
      });
    });
  });

  describe('getSection : get last version number and value for specific key modified', () => {
    it('should return 2025 an error with an empty sectionName parameter ', async () => {
      const sectionName = '';
      const result = await natsExecutionModel.getSection(sectionName);
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2025 an error with a sectionName is Contain Special Char parameter ', async () => {
      const sectionName = 'Section.Model';
      const result = await natsExecutionModel.getSection(sectionName);
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2010  if key is not found ', async () => {
      const response = await natsExecutionModel.getSection(sectionName);
      expect(response).toEqual({ ...NatsResponseCode[2010] });
    });

    describe('if inserted key', () => {
      beforeAll(async () => {
        await natsExecutionModel.upsertSection(sectionName, sectionData);
      });
      it('should return 2007  if key is found ', async () => {
        const response = await natsExecutionModel.getSection(sectionName);
        expect(response).toEqual({
          ...NatsResponseCode[2007],
          value: response.value,
          seq: 1,
        });
      });
      afterAll(async () => {
        await natsExecutionModel.destroyNatsBucket();
      });
    });
  });

  describe('getSectionByVersion : get specific key value by version modified', () => {
    it('should return 2025 an error with an empty sectionName parameter ', async () => {
      const sectionName = '';
      const result = await natsExecutionModel.getSectionByVersion(
        sectionName,
        1,
      );
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2025 an error with a sectionName is Contain Special Char parameter ', async () => {
      const sectionName = 'Section.Model';
      const result = await natsExecutionModel.getSectionByVersion(
        sectionName,
        1,
      );
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2026 an error with an version parameter ', async () => {
      const result = await natsExecutionModel.getSectionByVersion(
        sectionName,
        -1,
      );
      expect(result).toEqual(NatsResponseCode[2026]);
    });

    it('should return 2010  if key is not found ', async () => {
      const response = await natsExecutionModel.getSectionByVersion(
        sectionName,
        1,
      );
      expect(response).toEqual({ ...NatsResponseCode[2010] });
    });

    describe('if inserted key', () => {
      beforeAll(async () => {
        await natsExecutionModel.upsertSection(sectionName, sectionData);
      });
      it('should return 2010  if key is not found ', async () => {
        const response = await natsExecutionModel.getSectionByVersion(
          sectionName,
          4,
        );
        expect(response).toEqual({ ...NatsResponseCode[2010] });
      });
      it('should return 2007  if keys is found ', async () => {
        const response = await natsExecutionModel.getSectionByVersion(
          sectionName,
          1,
        );
        expect(response).toEqual({
          ...NatsResponseCode[2007],
          value: response.value,
          seq: 1,
        });
      });
      afterAll(async () => {
        await natsExecutionModel.destroyNatsBucket();
      });
    });
  });

  describe('getHistoricSection : get historic of modified specific section', () => {
    it('should return 2025 an error with an empty sectionName parameter ', async () => {
      const sectionName = '';
      const result = await natsExecutionModel.getHistoricSection(sectionName);
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2025 an error with a sectionName is Contain Special Char parameter ', async () => {
      const sectionName = 'Section.Model';
      const result = await natsExecutionModel.getHistoricSection(sectionName);
      expect(result).toEqual(NatsResponseCode[2025]);
    });

    it('should return 2010  if key is not found ', async () => {
      const response = await natsExecutionModel.getHistoricSection(sectionName);
      expect(response).toEqual({ ...NatsResponseCode[2010] });
    });

    describe('if inserted key', () => {
      beforeAll(async () => {
        await natsExecutionModel.upsertSection(sectionName, sectionData);
      });
      it('should return 2011  if key is found ', async () => {
        const response =
          await natsExecutionModel.getHistoricSection(sectionName);
        expect(response).toEqual({
          ...NatsResponseCode[2011],
          value: [
            {
              value: response.value[0]?.value,
              version: response.value[0]?.version,
              createdAt: response.value[0]?.createdAt,
              operation: response.value[0]?.operation,
            },
          ],
        });
      });
      afterAll(async () => {
        await natsExecutionModel.destroyNatsBucket();
      });
    });
  });
});
