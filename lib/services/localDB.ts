import Dexie, { EntityTable } from 'dexie';
import { TLocalStore } from '@/types/general';

const localDB = new Dexie('localDB') as Dexie & {
    localData: EntityTable<TLocalStore, 'storageId'>;
};

localDB.version(1).stores({
    localData: 'storageId'
});

export { localDB };
