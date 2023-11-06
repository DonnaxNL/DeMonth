import { FirebaseOrder } from 'src/app/models/firebase.order';
import { Component, Inject } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/functions';
import { DatePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Helper } from 'src/app/shared/helper';

export interface SummaryDialogData {
    order: FirebaseOrder
    freeBoxClaimed: boolean
}

@Component({
    selector: 'summary-dialog',
    templateUrl: 'summary-dialog.html',
})
export class SummaryDialog {

    constructor(
        public dialogRef: MatDialogRef<SummaryDialog>,
        @Inject(MAT_DIALOG_DATA) public data: SummaryDialogData,
        public datepipe: DatePipe,
        public fun: AngularFireFunctions,) {
    }

    onCloseClick(): void {
        this.dialogRef.close();
    }
}