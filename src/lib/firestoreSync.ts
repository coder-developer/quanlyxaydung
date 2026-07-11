import { 
  collection, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  doc, 
  getDocsFromServer, 
  writeBatch 
} from 'firebase/firestore';
import { db, auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Error logger conformant to the Firebase Integration Skill
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error details: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Check if we can reach the server to validate connection stability
 */
export async function testConnection(): Promise<boolean> {
  try {
    const testDocRef = doc(db, 'system_connection_test', 'status');
    await getDocsFromServer(collection(db, 'system_connection_test'));
    return true;
  } catch (error) {
    console.warn("Firestore connection check failed. Server might be offline or permissions restricted.", error);
    return false;
  }
}

/**
 * Fetch all documents from a specific Firestore collection
 */
export async function fetchCollection(collectionName: string): Promise<any[]> {
  try {
    const querySnapshot = await getDocs(collection(db, collectionName));
    const list: any[] = [];
    querySnapshot.forEach((doc) => {
      list.push({ ...doc.data(), id: doc.id });
    });
    return list;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
    return [];
  }
}

/**
 * Save a single document to Firestore
 */
export async function saveDocument(collectionName: string, docId: string, data: any): Promise<void> {
  try {
    const cleanId = docId.replace(/[^a-zA-Z0-9_\-]/g, '_'); // Guard against invalid IDs
    const docRef = doc(db, collectionName, cleanId);
    // Remove the 'id' field from the payload itself if desired to avoid redundancy, but keeping is also fine
    const payload = { ...data };
    await setDoc(docRef, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

/**
 * Delete a single document from Firestore
 */
export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${docId}`);
  }
}

/**
 * Batch upload a list of items to a Firestore collection
 */
export async function batchSaveCollection(collectionName: string, items: any[], idField = 'id'): Promise<void> {
  try {
    const batch = writeBatch(db);
    let count = 0;
    
    for (const item of items) {
      // Get unique doc ID
      let docId = item[idField];
      if (!docId && collectionName === 'material_limits') {
        docId = `${item.project_id}_${item.item_id}`;
      }
      if (!docId) {
        docId = Math.random().toString(36).substring(2, 9);
      }
      
      const cleanId = String(docId).replace(/[^a-zA-Z0-9_\-]/g, '_');
      const docRef = doc(db, collectionName, cleanId);
      
      batch.set(docRef, item);
      count++;
      
      // Firestore batch limit is 500 writes
      if (count >= 400) {
        await batch.commit();
        count = 0;
      }
    }
    
    if (count > 0) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}
