import LoadScript from 'dynamic-load-script';

type VkAuthData = Record<string, string>;

type NativeVkOpenApiClient = {
  init(params: { apiId: number }): void;
  Widgets: {
    Auth(containerId: string, params: { onAuth: (authData: Record<string, string>) => void }): void;
  };
  api(method: string, params: Record<string, string>, cb: (res: unknown) => void): void;
};

export default class VkApi {
  private constructor(
    private readonly nativeVk: NativeVkOpenApiClient,
    apiId: number,
    containerId: string,
    /**
     * Used as a default version for calling API
     */
    private readonly version: string,
  ) {
    this.nativeVk.init({ apiId });
    this.authorized = this.initAuthWidget(containerId);
    this.authorized.then(((authData) => {
      this.innerAuthData = authData;
    }));
  }

  /**
   * Promise resolves with auth data
   */
  public readonly authorized;

  private static instance: VkApi;

  public static async create(apiId: number, containerId = 'vk-auth-widget', version = '5.131') {
    if (VkApi.instance) {
      // TODO: Handle different apiId
      throw new Error('Cant instantiate VKApi twice.');
    }
    const vkLoaded = await LoadScript('https://vk.com/js/api/openapi.js?169');
    if (!vkLoaded) {
      throw new Error('Error while loading VK OpenAPI script.');
    }
    const nativeVK = (window as any).VK as NativeVkOpenApiClient;
    VkApi.instance = new VkApi(nativeVK, apiId, containerId, version);
    return VkApi.instance;
  }

  private innerAuthData?: VkAuthData;

  public get authData() {
    return this.innerAuthData;
  }

  private initAuthWidget(containerId: string): Promise<VkAuthData> {
    return new Promise((resolve) => {
      this.nativeVk.Widgets.Auth(containerId, {
        // TODO: Add error handler
        onAuth: resolve,
      });
    });
  }

  async call(method: string, params: Record<string, string>) {
    if (!this.authData) {
      throw new Error('Trying to call API before authorization.');
    }
    return new Promise((resolve) => {
      this.nativeVk.api(method, { v: this.version, ...params }, resolve);
    });
  }
}
