import { Component, OnInit } from '@angular/core';
import { PageDetailService } from 'src/app/services/page-detail-service';
import { FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';
import { MyErrorStateMatcher } from 'src/app/shared/errormatcher';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { AngularFireFunctions } from '@angular/fire/functions';
import { Helper } from 'src/app/shared/helper';

@Component({
  selector: 'app-contact-form',
  templateUrl: './contact-form.component.html',
  styleUrls: ['./contact-form.component.scss']
})
export class ContactFormComponent implements OnInit {
  matcher = new MyErrorStateMatcher();
  formGroup: FormGroup;
  completed = false

  formDetails = {
    name: '',
    email: '',
    phone: null,
    subject: '',
    message: '',
    orderRef: null
  }

  subjects = [
    ['general', 'Ik heb een algemene vraag/opmerking'],
    ['subscription', 'Ik heb een vraag betreft mijn abonnement'],
    ['custom', 'Ik wil een abonnement met een speciale cyclus'],
    ['business', 'Ik wil samenwerken met DeMonth']
  ]

  constructor(
    private title: PageDetailService,
    private _formBuilder: FormBuilder,
    private helper: Helper,
    public fun: AngularFireFunctions,
    public translate: TranslateService,
  ) { }

  ngOnInit(): void {
    this.title.setDetails("contact")
    this.setTranslations()
    this.formValidation()
  }

  async setTranslations() {
    //Subjects
    this.subjects[0][1] = await this.translate.get('contact.subject_general').toPromise();
    this.subjects[1][1] = await this.translate.get('contact.subject_subscription').toPromise();
    this.subjects[2][1] = await this.translate.get('contact.subject_custom').toPromise();
    this.subjects[3][1] = await this.translate.get('contact.subject_business').toPromise();

    // Listen for real-time language change
    this.translate.onLangChange.subscribe(async (event: LangChangeEvent) => {
      this.subjects[0][1] = await this.translate.get('contact.subject_general').toPromise();
      this.subjects[1][1] = await this.translate.get('contact.subject_subscription').toPromise();
      this.subjects[2][1] = await this.translate.get('contact.subject_custom').toPromise();
      this.subjects[3][1] = await this.translate.get('contact.subject_business').toPromise();
    });
  }

  formValidation() {
    // New message
    this.formGroup = this._formBuilder.group({
      name: new FormControl('', [Validators.required]),
      email: new FormControl('', [Validators.required]),
      phone: null,
      subject: null,
      message: new FormControl('', [Validators.required]),
      orderRef: null
    });
  }

  sendMessage() {
    if (this.formGroup.valid) {
      console.log(this.formDetails)
      const sendMailCall = this.fun.httpsCallable('contactEmail');
      sendMailCall(this.formDetails).subscribe((result) => {
        console.log('done');
        this.completed = true
      });
    } else {
      this.helper.validateAllFormFields(this.formGroup);
    }
  }

}
