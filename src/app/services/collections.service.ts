import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, getDoc, getDocs, query, where } from '@angular/fire/firestore';
import { from, map, Observable } from 'rxjs';

export interface CollectionDoc {
  id?: string;
  name: string;
  slug: string;
  description?: string;
  heroImageUrl?: string;
  active?: boolean;
  seo?: {
    title?: string;
    description?: string;
    image?: string;
  };
  filters?: {
    tags?: string[];
    priceBands?: { label: string; min: number; max: number }[];
    personalization?: boolean;
  };
}

@Injectable({ providedIn: 'root' })
export class CollectionsService {
  private firestore = inject(Firestore);

  getCollectionBySlug(slug: string): Observable<CollectionDoc | null> {
    const col = collection(this.firestore, 'collections');
    const q = query(col, where('slug', '==', slug));
    return from(getDocs(q)).pipe(
      map(snapshot => {
        if (snapshot.empty) return null;
        const d = snapshot.docs[0];
        return { id: d.id, ...d.data() } as CollectionDoc;
      })
    );
  }

  async getCollectionBySlugOnce(slug: string): Promise<CollectionDoc | null> {
    const col = collection(this.firestore, 'collections');
    const q = query(col, where('slug', '==', slug));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const d = snap.docs[0];
    return { id: d.id, ...d.data() } as CollectionDoc;
  }

  async addCollection(payload: Omit<CollectionDoc, 'id'>): Promise<string> {
    const col = collection(this.firestore, 'collections');
    const docRef = await addDoc(col, payload);
    return docRef.id;
  }

  async getAllCollections(): Promise<CollectionDoc[]> {
    const col = collection(this.firestore, 'collections');
    const snap = await getDocs(col);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as CollectionDoc));
  }

  async updateCollection(id: string, payload: Partial<CollectionDoc>): Promise<void> {
    const ref = doc(this.firestore, `collections/${id}`);
    await updateDoc(ref, payload as any);
  }

  async deleteCollection(id: string): Promise<void> {
    const ref = doc(this.firestore, `collections/${id}`);
    await deleteDoc(ref);
  }
}
