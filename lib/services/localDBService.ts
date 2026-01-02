
import { TLocalStore, TLocalStoreRecordType } from '@/types/general';
import { localDB } from '@/lib/services/localDB';

class LocalDBService {
    static async setLocalDataItem(localData: TLocalStoreRecordType, localDataProp: keyof TLocalStore) {
        try {
            const data = await localDB.localData.get({ storageId: 1 });
            await localDB.localData.put({ ...data, [localDataProp]: localData, storageId: 1 });
            return true;
        } catch (e) {
            throw e;
        }
    }
    static async getLocalDataItem<K extends keyof TLocalStore>(itemProp: K): Promise<TLocalStore[K] | undefined> {
        try {
            const data = await localDB.localData.get({ storageId: 1 });
            return data?.[itemProp];
        } catch (e) {
            throw e;
        }
    }
}

export default LocalDBService;
