declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

declare module 'multer' {
  import { Request } from 'express';

  interface StorageEngine {
    _handleFile(
      req: Request,
      file: Express.Multer.File,
      callback: (error?: Error | null, info?: Partial<Express.Multer.File>) => void,
    ): void;
    _removeFile(req: Request, file: Express.Multer.File, callback: (error: Error | null) => void): void;
  }

  interface Options {
    dest?: string;
    storage?: StorageEngine;
    limits?: { fileSize?: number };
    fileFilter?(
      req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, acceptFile?: boolean) => void,
    ): void;
  }

  interface MulterRequest extends Request {
    file?: Express.Multer.File;
    files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
  }

  function diskStorage(options: {
    destination?(
      req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, destination: string) => void,
    ): void;
    filename?(
      req: Request,
      file: Express.Multer.File,
      cb: (error: Error | null, filename: string) => void,
    ): void;
  }): StorageEngine;

  function multer(options?: Options): any;
}

export {};
