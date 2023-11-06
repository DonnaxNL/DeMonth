import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { DeliveryDaysDialog } from "./pick-days/pick-days.component";
import { TransferComponent } from "./transfer.component";

@NgModule({
    declarations: [
        TransferComponent,
        DeliveryDaysDialog
    ],
    imports: [
        SharedModule
    ],
    entryComponents: [
        DeliveryDaysDialog
    ]
})

export class TransferModule {
}