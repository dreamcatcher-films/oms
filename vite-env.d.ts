declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

interface FileSystemFileHandle {
  getFile(): Promise<File>;
  createWritable(): Promise<FileSystemWritableFileStream>;
  readonly kind: 'file';
  readonly name: string;
}

interface Window {
  showOpenFilePicker(options?: any): Promise<FileSystemFileHandle[]>;
}
