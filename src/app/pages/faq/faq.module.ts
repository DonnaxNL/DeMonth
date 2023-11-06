import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { FaqComponent } from "./faq.component";

@NgModule({
    declarations: [
        FaqComponent
    ],
    imports: [
        SharedModule
    ]
})

export class FaqModule {
}