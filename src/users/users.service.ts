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

  async update(
    uid: string,
    data: { name?: string; currency?: string; payday?: number },
  ) {
    const ref = this.firestore.collection('users').doc(uid);
    await ref.set(data, { merge: true });
    const updated = await ref.get();
    return updated.data();
  }
}
