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
        // En producción, usar variables de entorno
        if (process.env.FIREBASE_PROJECT_ID && 
            process.env.FIREBASE_CLIENT_EMAIL && 
            process.env.FIREBASE_PRIVATE_KEY) {
          return admin.initializeApp({
            credential: admin.credential.cert({
              projectId: process.env.FIREBASE_PROJECT_ID,
              clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
              privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
          });
        }

        // En desarrollo, leer archivo JSON
        const filePath = join(__dirname, 'serviceAccountKey.json');
        const fileContents = readFileSync(filePath, 'utf8');
        const serviceAccount = JSON.parse(fileContents) as ServiceAccount;

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
