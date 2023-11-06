import { Component, Inject } from "@angular/core";
import { MatDialogRef, MAT_DIALOG_DATA } from "@angular/material/dialog";

export interface DialogData {
    dialogInfo: any;
    dialogImage: string;
  }

@Component({
    selector: 'product-detail-dialog',
    templateUrl: 'product-detail-dialog.html',
})
export class ProductDetailDialog {

    constructor(
        public dialogRef: MatDialogRef<ProductDetailDialog>,
        @Inject(MAT_DIALOG_DATA) public dialogData: DialogData) { }

    onNoClick(): void {
        this.dialogRef.close();
    }
}