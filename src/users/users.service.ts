import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class UsersService {
  constructor(@Inject('FIREBASE_ADMIN') private admin: admin.app.App) {}

  private get firestore() {
    return this.admin.firestore();
  }

  async findById(uid: string) {
    const doc = await this.firestore.collection('users').doc(uid).get();
    if (!doc.exists) throw new NotFoundException('Usuario no encontrado');
    return doc.data();
  }

  async update(uid: string, data: any) {
    const ref = this.firestore.collection('users').doc(uid);
    await ref.set(data, { merge: true });
    const updated = await ref.get();
    return updated.data();
  }

  /**
   * Actualiza el nombre público del usuario
   */
  async updateDisplayName(uid: string, displayName: string) {
    const ref = this.firestore.collection('users').doc(uid);
    await ref.set({ displayName }, { merge: true });
    const updated = await ref.get();
    return updated.data();
  }

  /**
   * Sincroniza el email desde Firebase Auth a Firestore
   * Se llama automáticamente cuando el guard detecta un cambio de email
   */
  async syncEmailFromAuth(uid: string, emailFromToken: string): Promise<void> {
    const userRef = this.firestore.collection('users').doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      await userRef.set({
        uid,
        email: emailFromToken,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return;
    }

    const userData = userDoc.data();
    if (userData?.email !== emailFromToken) {
      await userRef.update({
        email: emailFromToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  }
}
