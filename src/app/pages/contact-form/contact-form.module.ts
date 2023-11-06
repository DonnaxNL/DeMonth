import { NgModule } from "@angular/core";
import { SharedModule } from "src/app/shared/shared.module";
import { ContactFormComponent } from "./contact-form.component";

@NgModule({
    declarations: [
        ContactFormComponent
    ],
    imports: [
        SharedModule
    ]
})

export class ContactFormModule {
}