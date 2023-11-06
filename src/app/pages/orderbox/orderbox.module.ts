import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { BottomSheetOverview, OrderboxComponent, OrderBoxDialog } from "./orderbox.component";

@NgModule({
    declarations: [
        OrderboxComponent,
        OrderBoxDialog,
        BottomSheetOverview
    ],
    imports: [
        SharedModule
    ],
    entryComponents: [
      OrderBoxDialog,
      BottomSheetOverview
    ]
})

export class OrderboxModule {
}