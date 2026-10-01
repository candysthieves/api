import { FilesService } from './files.service.js';
import { FileType } from '../schemas/files.schema.js';
import type { UploadFileContract } from '../../../../../../libs/contracts/index.js';

describe('FilesService cleanup', () => {
  function setup() {
    const model = {
      create: jest.fn().mockRejectedValue(new Error('Metadata unavailable')),
      findOne: jest.fn(),
    };
    const s3 = {
      uploadFile: jest
        .fn<Promise<void>, [string, Buffer, string]>()
        .mockResolvedValue(undefined),
      deleteFile: jest.fn().mockResolvedValue(undefined),
    };
    const processing = {
      process: jest.fn().mockResolvedValue({
        format: 'webp',
        buffer: Buffer.from([1]),
        size: 1,
        width: 10,
        height: 10,
      }),
    };
    const service = new FilesService(
      model as unknown as ConstructorParameters<typeof FilesService>[0],
      s3 as unknown as ConstructorParameters<typeof FilesService>[1],
      processing as unknown as ConstructorParameters<typeof FilesService>[2],
    );
    return { service, model, s3 };
  }

  afterEach(() => jest.restoreAllMocks());

  it('leaves the uploaded object for orphan cleanup when metadata cannot be saved', async () => {
    const { service, s3 } = setup();
    await expect(
      service.saveFile({} as UploadFileContract, FileType.POST),
    ).rejects.toThrow('Metadata unavailable');
    expect(s3.deleteFile).not.toHaveBeenCalled();
  });

  it('removes both the stored object and metadata', async () => {
    const { service, s3, model } = setup();
    const file = {
      key: 'image-key',
      deleteOne: jest.fn().mockResolvedValue(undefined),
    };
    model.findOne.mockResolvedValue(file);
    await service.deleteFile('image');
    expect(s3.deleteFile).toHaveBeenCalledWith('image-key');
    expect(file.deleteOne).toHaveBeenCalled();
  });

  it('keeps metadata if the object could not be deleted', async () => {
    const { service, s3, model } = setup();
    const file = { key: 'image-key', deleteOne: jest.fn() };
    model.findOne.mockResolvedValue(file);
    s3.deleteFile.mockRejectedValue(new Error('S3 unavailable'));
    await expect(service.deleteFile('image')).rejects.toThrow('S3 unavailable');
    expect(file.deleteOne).not.toHaveBeenCalled();
  });
});
