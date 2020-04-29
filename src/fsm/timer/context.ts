export interface Context {
  current: number;
  limit?: number;
}

export const initialContext: Context = {
  current: 0
};
