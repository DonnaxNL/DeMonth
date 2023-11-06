import { Component, Inject, OnInit } from '@angular/core';
import { AngularFireFunctions } from '@angular/fire/functions';
import { DatePipe } from '@angular/common';
import { Moment } from 'moment';
import { OrderService } from 'src/app/services/firebase/order-service';
import { UserService } from 'src/app/services/firebase/user-service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDatepickerInputEvent } from '@angular/material/datepicker';
import { FormGroup, FormBuilder, FormControl, Validators } from '@angular/forms';
import { MyErrorStateMatcher } from 'src/app/shared/errormatcher';
import { Helper } from 'src/app/shared/helper';

export interface ChangeDaysDialogData {
    order: any
    days: number,
    weeks: number
}

@Component({
    selector: 'pick-days-dialog',
    templateUrl: 'pick-days-dialog.html',
})
export class DeliveryDaysDialog implements OnInit {
    minDate = new Date()
    noDays = []
    noWeeks = []
    numberOfDays = null
    numberOfWeeks = null
    customDays = false

    formGroup: FormGroup;
    matcher = new MyErrorStateMatcher();

    constructor(
        public dialogRef: MatDialogRef<DeliveryDaysDialog>,
        @Inject(MAT_DIALOG_DATA) public dialogData: ChangeDaysDialogData,
        private _formBuilder: FormBuilder,
        public datepipe: DatePipe,
        public userService: UserService,
        public orderService: OrderService,
        public fun: AngularFireFunctions) {
        dialogRef.disableClose = true;
        this.numberOfDays = this.dialogData.days != 0 ? this.dialogData.days : 28 
        this.numberOfWeeks = this.dialogData.weeks
        if (this.dialogData.days > 50) {
            this.customDays = true
        } else {
            for (let i = 14; i < 71; i++) {
                this.noDays.push(i);
            }
        }
        for (let i = 2; i < 11; i++) {
            this.noWeeks.push(i);
        }
    }

    ngOnInit(): void {
        this.minDate.setDate(new Date().getDate() + 7);
        this.minDate.setHours(0, 0, 0, 0)
        this.formGroup = this._formBuilder.group({
            selectedDays: new FormControl('', [Validators.min(14), Validators.max(365)]),
            selectedWeeks: new FormControl('', [Validators.min(2), Validators.max(10)])
        });
    }

    onNoClick(): void {
        this.dialogRef.close();
    }

    setCycle() {
        this.dialogRef.close({ days: this.numberOfDays, weeks: this.numberOfWeeks });
    }

    onSelectChanged(type, value) {
        console.log(type, value)
        var diff
        if (type == 'weeks') {
            if (value != null) {
                var cycle = value * 7
                diff = cycle - this.dialogData.days
                console.log(diff, cycle, this.dialogData.days)
                this.dialogData.days = cycle
                this.formGroup.get('selectedDays').setValidators([Validators.min(14), Validators.max(365)])
                this.numberOfDays = null
            }
        } else if (type == 'days') {
            if (value != null) {
                diff = value - this.dialogData.days
                this.dialogData.days = value
                this.numberOfWeeks = null
                this.formGroup.get('selectedDays').setValidators([Validators.min(14), Validators.max(365), Validators.required])
            }
        }
    }

    toggleCustomDays() {
        if (this.numberOfDays) {
            this.formGroup.get('selectedDays').setValidators([Validators.min(14), Validators.max(365), Validators.required])
        }
        this.customDays = true
    }
}