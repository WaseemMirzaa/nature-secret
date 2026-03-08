declare module 'bcryptjs' {
  function hash(s: string, rounds: number): Promise<string>;
  function hashSync(s: string, rounds: number): string;
  function compare(s: string, hash: string): Promise<boolean>;
  function compareSync(s: string, hash: string): boolean;
}
