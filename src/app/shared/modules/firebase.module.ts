import { NgModule } from '@angular/core';
import { AngularFireModule } from '@angular/fire';
import { AngularFireAuthModule } from '@angular/fire/auth';
import { AngularFireDatabaseModule } from '@angular/fire/database';
import { AngularFireFunctionsModule } from '@angular/fire/functions';
import { environment } from 'src/environments/environment';

@NgModule({
    imports: [
        AngularFireModule.initializeApp(environment.firebaseConfig),
        AngularFireAuthModule,
        AngularFireModule,
        AngularFireDatabaseModule,
        AngularFireFunctionsModule,
    ],
    exports: [
        AngularFireModule,
        AngularFireAuthModule,
        AngularFireModule,
        AngularFireDatabaseModule,
        AngularFireFunctionsModule,
    ]
})

export class FirebaseModule {
}