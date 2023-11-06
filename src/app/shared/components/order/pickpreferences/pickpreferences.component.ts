import { Component, OnInit, Input, isDevMode } from '@angular/core';
import { TranslateService, LangChangeEvent } from '@ngx-translate/core';
import { BoxType } from 'src/app/models/box';
import { Router } from '@angular/router';
import { OrderboxComponent } from 'src/app/pages/orderbox/orderbox.component';
import { EditProductsComponent } from 'src/app/pages/account/edit-products/edit-products.component';
import { Observable } from 'rxjs';
import { User } from 'firebase';
import { AngularFireAuth } from '@angular/fire/auth';
import { CheckCustomer } from 'src/app/check-customer.test';
import { Products } from 'src/app/constants/products';
import { AppComponent } from 'src/app/app.component';

@Component({
  selector: 'order-pickpreferences',
  templateUrl: './pickpreferences.component.html',
  styleUrls: ['./pickpreferences.component.scss']
})
export class PickPreferencesComponent implements OnInit {

  public selectedProducts = {
    removeBuds: false,
    extraProducts: null,
    tampons: null,
    pads: null,
    liners: null,
    preferences: null
  }

  @Input() boxType: BoxType
  @Input() editMode: boolean
  @Input() recovered: boolean = false
  @Input() referralMode: boolean = false
  @Input() trialBox: boolean = false

  @Input() set productSelected(value) {
    if (value) {
      this.selectedProducts = value
    }
    if (isDevMode()) {
      console.log(this.selectedProducts)
    }
    this.ngOnInit()
    //this.setSelections()
  }

  user$: Observable<User | null>;
  index: number;
  chocolateIsSelected = false
  healthbarIsSelected = false
  granolaIsSelected = false
  chocolateOptions = []
  healthbarOptions = []
  granolaOptions = []
  skinOptions = []
  chocolateSelected = []
  chocolateSelectorSelected = []
  chocolateSelectedPrev = []
  healthbarSelected = []
  healthbarSelectorSelected = []
  healthbarSelectedPrev = []
  granolaSelected = []
  granolaSelectorSelected = []
  granolaSelectedPrev = []
  skinSelected = 'no_pref'

  modalInfo = {
    name: '',
    type: '',
    brand: '',
    description: ''
  };

  isCustomer = true

  constructor(
    private app: AppComponent,
    private router: Router,
    private translate: TranslateService,
    private orderbox: OrderboxComponent,
    private auth: AngularFireAuth,
    private checkCustomer: CheckCustomer,
    private editproducts: EditProductsComponent,
    private products: Products
  ) { }

  ngOnInit() {
    this.setProducts()
    this.setSelectTranslations()
    this.user$ = this.auth.user;
    this.app.addToSubscriptions(this.user$.subscribe((user: User) => {
      this.isCustomer = this.checkCustomer.isRealCustomer(user)
    }));
    this.setSelections()
  }

  setSelections() {
    if (this.editMode && this.selectedProducts.preferences != null ||
      this.recovered && this.selectedProducts.preferences != null) {
      if (this.selectedProducts.preferences.chocolate) {
        this.chocolateSelected = this.selectedProducts.preferences.chocolate
        this.selectedProducts.preferences.chocolate.forEach(element => {
          this.chocolateSelectorSelected.push(element.id)
        });
        if (this.selectedProducts.preferences.chocolate.includes('none')) {
          this.chocolateIsSelected = false
        } else {
          this.chocolateIsSelected = true
        }
      }

      if (this.selectedProducts.preferences.healthbar) {
        this.healthbarSelected = this.selectedProducts.preferences.healthbar
        this.selectedProducts.preferences.healthbar.forEach(element => {
          this.healthbarSelectorSelected.push(element.id)
        });
        if (this.selectedProducts.preferences.healthbar.includes('none')) {
          this.healthbarIsSelected = false
        } else {
          this.healthbarIsSelected = true
        }
      }

      if (this.selectedProducts.preferences.granola) {
        this.granolaSelected = this.selectedProducts.preferences.granola
        this.selectedProducts.preferences.granola.forEach(element => {
          this.granolaSelectorSelected.push(element.id)
        });
        if (this.selectedProducts.preferences.granola.includes('none')) {
          this.granolaIsSelected = false
        } else {
          this.granolaIsSelected = true
        }
      }

      if (this.selectedProducts.preferences.skinType) {
        this.skinSelected = this.selectedProducts.preferences.skinType
      }
    }
    
    console.log(this.chocolateSelected, this.healthbarSelected, this.granolaSelected)
  }

  setProducts() {
    this.chocolateOptions = this.products.chocolateOptions
    this.healthbarOptions = this.products.healthbarOptions
    this.granolaOptions = this.products.granolaOptions
    this.skinOptions = this.products.skinOptions
  }

  async setSelectTranslations() {
    this.chocolateOptions[0][2] = await this.translate.get('products.tony_chocolate_milk').toPromise();
    this.chocolateOptions[1][2] = await this.translate.get('products.tony_chocolate_caramel').toPromise();
    this.chocolateOptions[2][2] = await this.translate.get('products.tony_chocolate_nougat').toPromise();
    this.chocolateOptions[3][2] = await this.translate.get('products.tony_chocolate_hazelnut').toPromise();
    this.chocolateOptions[4][2] = await this.translate.get('products.tony_chocolate_dark').toPromise();
    this.skinOptions[0][1] = await this.translate.get('order_box.personalise_preference_skin_no_preference').toPromise();
    this.skinOptions[1][1] = await this.translate.get('products.skin_type_normal').toPromise();
    this.skinOptions[2][1] = await this.translate.get('products.skin_type_mixed').toPromise();
    this.skinOptions[3][1] = await this.translate.get('products.skin_type_dry').toPromise();
    this.skinOptions[4][1] = await this.translate.get('products.skin_type_oil').toPromise();

    // Listen for real-time language change
    this.translate.onLangChange.subscribe(async (event: LangChangeEvent) => {
      this.chocolateOptions[0][2] = await this.translate.get('products.tony_chocolate_milk').toPromise();
      this.chocolateOptions[1][2] = await this.translate.get('products.tony_chocolate_caramel').toPromise();
      this.chocolateOptions[2][2] = await this.translate.get('products.tony_chocolate_nougat').toPromise();
      this.chocolateOptions[3][2] = await this.translate.get('products.tony_chocolate_hazelnut').toPromise();
      this.chocolateOptions[4][2] = await this.translate.get('products.tony_chocolate_dark').toPromise();
      this.skinOptions[0][1] = await this.translate.get('order_box.personalise_preference_skin_no_preference').toPromise();
      this.skinOptions[1][1] = await this.translate.get('products.skin_type_normal').toPromise();
      this.skinOptions[2][1] = await this.translate.get('products.skin_type_mixed').toPromise();
      this.skinOptions[3][1] = await this.translate.get('products.skin_type_dry').toPromise();
      this.skinOptions[4][1] = await this.translate.get('products.skin_type_oil').toPromise();
    });
  }

  onSelectChanged(type?: string) {
    if (type == 'chocolate') {
      if (isDevMode()) {
        console.log('before', this.chocolateSelectedPrev, this.chocolateSelected, this.chocolateSelectorSelected);
      }
      this.productMap(type)
      if (this.chocolateSelectedPrev != null && this.chocolateSelectedPrev.includes('none') || this.chocolateSelectedPrev.includes('no_pref')) {
        var newArray = []
        this.chocolateSelected.forEach(chocolate => {
          if (chocolate != 'none') {
            newArray.push(chocolate)
          }
        });
      } else if (this.chocolateSelected.includes('none')) {
        this.chocolateSelected = ['none']
      } else if (this.chocolateSelected.length == 0){
        this.chocolateSelected = ['no_pref']
      }
      this.chocolateSelectedPrev = this.chocolateSelected
      if (isDevMode()) {
        console.log('after', this.chocolateSelectedPrev, this.chocolateSelected, this.skinSelected);
      }
    } else if (type == 'healthbar') {
      if (isDevMode()) {
        console.log('before', this.healthbarSelectedPrev, this.healthbarSelected);
      }
      this.productMap(type)
      if (this.healthbarSelectedPrev != null && this.healthbarSelectedPrev.includes('none') || this.healthbarSelectedPrev.includes('no_pref')) {
        var newArray = []
        this.healthbarSelected.forEach(healthbar => {
          if (healthbar != 'none') {
            newArray.push(healthbar)
          }
        });
      } else if (this.healthbarSelected.includes('none')) {
        this.healthbarSelected = ['none']
      } else if (this.healthbarSelected.length == 0){
        this.healthbarSelected = ['no_pref']
      }
      this.healthbarSelectedPrev = this.healthbarSelected
      if (isDevMode()) {
        console.log('after', this.healthbarSelectedPrev, this.healthbarSelected, this.skinSelected);
      }
    } else if (type == 'granola') {
      if (isDevMode()) {
        console.log('before', this.granolaSelectedPrev, this.granolaSelected);
      }
      this.productMap(type)
      if (this.granolaSelectedPrev != null && this.granolaSelectedPrev.includes('none') || this.granolaSelectedPrev.includes('no_pref')) {
        var newArray = []
        this.granolaSelected.forEach(granola => {
          if (granola != 'none') {
            newArray.push(granola)
          }
        });
      } else if (this.granolaSelected.includes('none')) {
        this.granolaSelected = ['none']
      } else if (this.granolaSelected.length == 0){
        this.granolaSelected = ['no_pref']
      }
      this.granolaSelectedPrev = this.granolaSelected
      if (isDevMode()) {
        console.log('after', this.granolaSelectedPrev, this.granolaSelected, this.skinSelected);
      }
    }
    this.passProductData()
  }

  passProductData() {
    if (!this.editMode) {
      this.orderbox.updateProducts(this.productsToMap())
    } else {
      this.editproducts.updateProducts(this.productsToMap())
    }
  }

  productsToMap() {
    // Preferences
    this.selectedProducts.preferences = {
      chocolate: this.chocolateSelected.length == 0 ? ['none'] : this.chocolateSelected,
      healthbar: this.healthbarSelected.length == 0 ? ['none'] : this.healthbarSelected,
      granola: this.granolaSelected.length == 0 ? ['none'] : this.granolaSelected,
      skinType: this.skinSelected
    }
    return this.selectedProducts;
  }

  productMap(type) {
    if (type == 'chocolate') {
      this.chocolateSelected = []
      for (let i = 0; i < this.chocolateSelectorSelected.length; i++) {
        for (let j = 0; j < this.chocolateOptions.length; j++) {
          if (this.chocolateOptions[j][1] == this.chocolateSelectorSelected[i]) {
            var productItem = {
              id: this.chocolateOptions[j][1],
              brand: this.chocolateOptions[j][0],
              name: this.chocolateOptions[j][2]
            }
            this.chocolateSelected.push(productItem)
          }
        }
      }
    } else if (type == 'healthbar') {
      this.healthbarSelected = []
      for (let i = 0; i < this.healthbarSelectorSelected.length; i++) {
        for (let j = 0; j < this.healthbarOptions.length; j++) {
          if (this.healthbarOptions[j][1] == this.healthbarSelectorSelected[i]) {
            var productItem = {
              id: this.healthbarOptions[j][1],
              brand: this.healthbarOptions[j][0],
              name: this.healthbarOptions[j][2]
            }
            this.healthbarSelected.push(productItem)
          }
        }
      }
    } else if (type == 'granola') {
      this.granolaSelected = []
      for (let i = 0; i < this.granolaSelectorSelected.length; i++) {
        for (let j = 0; j < this.granolaOptions.length; j++) {
          if (this.granolaOptions[j][1] == this.granolaSelectorSelected[i]) {
            var productItem = {
              id: this.granolaOptions[j][1],
              brand: this.granolaOptions[j][0],
              name: this.granolaOptions[j][2]
            }
            this.granolaSelected.push(productItem)
          }
        }
      }
    }
  }

  onChangePreference(type, event: any) {
    if (type == 'chocolate') {
      if (event.checked) {
        this.chocolateIsSelected = true
        this.chocolateSelected = ['no_pref']
      } else {
        this.chocolateSelected = ['none']
        this.chocolateSelectorSelected = []
        this.chocolateIsSelected = false
      }
    } else if (type == 'healthbar') {
      if (event.checked) {
        this.healthbarIsSelected = true
        this.healthbarSelected = ['no_pref']
      } else {
        this.healthbarSelected = ['none']
        this.healthbarSelectorSelected = []
        this.healthbarIsSelected = false
      }
    } else if (type == 'granola') {
      if (event.checked) {
        this.granolaIsSelected = true
        this.granolaSelected = ['no_pref']
      } else {
        this.granolaSelected = ['none']
        this.granolaSelectorSelected = []
        this.granolaIsSelected = false
      }
    } 
    this.passProductData()
  }
}
