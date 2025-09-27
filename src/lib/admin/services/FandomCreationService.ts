export interface FandomCreationOptions {
  name: string;
  slug?: string;
  description?: string;
  template_id?: number;
  template_customizations?: any;
  initial_content?: any;
  created_by?: string;
}

export class FandomCreationService {
  static createFandom(options: any): Promise<any> {
    return Promise.resolve({});
  }
  static deleteFandom(...args: any[]): Promise<any> {
    return Promise.resolve({});
  }
  static updateFandom(...args: any[]): Promise<any> {
    return Promise.resolve({});
  }
  static getFandomDetails(...args: any[]): Promise<any> {
    return Promise.resolve({});
  }
  getFandomCreationStatus(...args: any[]): Promise<any> {
    return Promise.resolve({});
  }
}
