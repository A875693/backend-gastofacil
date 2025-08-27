import { Module, Global } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

interface ServiceAccount {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

@Global()
@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: (): admin.app.App => {
        // Leer archivo JSON de Firebase
        const filePath = join(__dirname, 'serviceAccountKey.json');
        const fileContents = readFileSync(filePath, 'utf8');

        // Parse seguro tipado
        const serviceAccount = JSON.parse(fileContents) as ServiceAccount;

        // Inicializar Firebase Admin
        return admin.initializeApp({
          credential: admin.credential.cert({
            projectId: serviceAccount.projectId,
            clientEmail: serviceAccount.clientEmail,
            privateKey: serviceAccount.privateKey.replace(/\\n/g, '\n'),
          }),
        });
      },
    },
  ],
  exports: ['FIREBASE_ADMIN'],
})
export class FirebaseAdminModule {}
