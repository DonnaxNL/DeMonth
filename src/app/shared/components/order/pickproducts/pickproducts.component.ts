import { Component, OnInit, Input, isDevMode } from '@angular/core';
import { Product } from 'src/app/models/product';
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
import { MatDialog } from '@angular/material/dialog';
import { ProductDetailDialog } from './product-detail-dialog/product-detail-dialog';
import { AppComponent } from 'src/app/app.component';

@Component({
  selector: 'order-pickproducts',
  templateUrl: './pickproducts.component.html',
  styleUrls: ['./pickproducts.component.scss']
})
export class PickProductsComponent implements OnInit {

  private boxType: BoxType;
  public selectedProducts = {
    removeBuds: false,
    extraProducts: null,
    tampons: null,
    pads: null,
    liners: null,
    preferences: null
  }

  @Input() editMode: boolean
  @Input() recovered: boolean = false
  @Input() referralMode: boolean = false

  @Input() set boxTypeValue(value: BoxType) {
    if (value != undefined) {
      if (this.boxType == null || value != this.boxType) {
        this.boxType = value;
        this.setBoxType(this.boxType)
      }
    }
  }

  @Input() set productSelected(value) {
    if (value) {
      this.selectedProducts = value
    }
    //If removeBuds
    if (this.selectedProducts.removeBuds) {
      this.maxPads = this.maxAmountProducts
    }
    this.ngOnInit()
    this.fillSelectors()
  }

  user$: Observable<User | null>;
  index: number;
  boxTypeId: string = '';
  maxPads = 0;
  maxAmountProducts = 0;
  maxExtraTampons = 0;
  maxExtraPads = 0;
  maxExtraLiners = 0;
  amountProductsSelected: number = 0;
  amountPadsSelected: number = 0;
  amountExtraProductsSelected: number = 0;
  amountExtraTamponsSelected: number = 0;
  amountExtraPadsSelected: number = 0;
  amountExtraLinersSelected: number = 0;
  selectorOptions = [];
  selectorExtraOptions = [];
  tamponAmount = [0, 0, 0];
  padsAmount = [0, 0, 0, 0];
  linersAmount = [0, 0];
  tamponsExtraAmount = [0, 0, 0];
  padsExtraAmount = [0, 0, 0, 0];
  linersExtraAmount = [0, 0];
  modalInfo = {
    name: '',
    type: '',
    brand: '',
    description: ''
  };
  modalProductImage = '';
  productTampon: Product[] = [];
  productPads: Product[] = [];
  productLiners: Product[] = [];
  productTypeAmounts = {
    tampons: 0,
    pads: 0,
    liners: 0
  }
  extraTampons = false
  extraPads = false
  extraLiners = false

  chocolateOptions = []
  skinOptions = []
  chocolateSelected = []
  chocolateSelectedPrev = []
  skinSelected = 'no_pref'

  isCustomer = true

  constructor(
    private app: AppComponent,
    private router: Router,
    private translate: TranslateService,
    private orderbox: OrderboxComponent,
    private auth: AngularFireAuth,
    private dialog: MatDialog,
    private checkCustomer: CheckCustomer,
    private editproducts: EditProductsComponent,
    private products: Products
  ) { }

  ngOnInit() {
    this.setProducts()
    this.user$ = this.auth.user;
    this.app.addToSubscriptions(this.user$.subscribe((user: User) => {
      this.isCustomer = this.checkCustomer.isRealCustomer(user)
    }));

    this.fillSelectorsWithProducts()
    this.getCurrentCount()
  }

  setProducts() {
    this.productTypeAmounts.tampons = this.products.productTypesTampons.length
    this.productTypeAmounts.pads = this.products.productTypesPads.length
    this.productTypeAmounts.liners = this.products.productTypesLiners.length
    if (this.boxTypeId != 'box_01') {
      this.maxAmountProducts = this.products.tamponsMaxAmount
    }
    if (this.selectedProducts.removeBuds || this.boxTypeId == 'box_01') {
      this.maxPads = this.maxAmountProducts
    } else {
      this.maxPads = this.products.padsMaxAmount
    }
    this.maxExtraTampons = this.products.tamponsMaxExtraAmount
    this.maxExtraPads = this.products.padsMaxExtraAmount
    this.maxExtraLiners = this.products.linersMaxExtraAmount
    this.chocolateOptions = this.products.chocolateOptions
    this.skinOptions = this.products.skinOptions
  }

  setBoxType(box) {
    this.productTampon = []
    this.productPads = []
    this.resetSelectors()
    //console.log('setBoxType called', box)
    this.boxTypeId = box.id
    //this.selectedProducts.removeBuds = false
    this.maxAmountProducts = box.maxItems
    this.maxPads = box.maxPads
    this.setProductDetails()
    this.fillSelectors()
  }

  async setProductDetails() {
    this.productTampon = [];
    this.productPads = [];
    var brand = await this.translate.get('products.brand_cottons').toPromise()
    for (let i = 0; i < this.products.productLanguageKeys.length; i++) {
      if (i == 0 || i % 7 == 0) {
        var product = {
          id: this.products.productLanguageKeys[i],
          name: await this.translate.get(this.products.productLanguageKeys[i + 1]).toPromise(),
          type: await this.translate.get(this.products.productLanguageKeys[i + 2]).toPromise(),
          brand: brand,
          image: this.products.productLanguageKeys[i + 3],
          description: await this.translate.get(this.products.productLanguageKeys[i + 4]).toPromise(),
          price: i < (4 * this.productTypeAmounts.pads) ? 23 : 13,
          heaviness: this.products.productLanguageKeys[i + 5],
          heavinessLevel: parseInt(this.products.productLanguageKeys[i + 6])
        }
        if (this.productPads.length < this.productTypeAmounts.pads) {
          this.productPads.push(product)
        } else if (this.productTampon.length < this.productTypeAmounts.tampons) {
          this.productTampon.push(product)
        } else if (this.productLiners.length < this.productTypeAmounts.liners) {
          this.productLiners.push(product)
        }
      }
    }
  }

  fillSelectorsWithProducts() {
    if (this.editMode && this.selectedProducts != null ||
      this.recovered && this.selectedProducts != null) {
      if (this.selectedProducts.pads) {
        var padItems = this.selectedProducts.pads
        for (let i = 0; i < padItems.length; i++) {
          if (padItems[i].name == 'Regular Wings' ||
            padItems[i].id == 'PR') {
            this.padsAmount[0] = padItems[i].amount
            this.selectorOptions[0] = []
            for (let j = 0; j <= padItems[i].amount; j++) {
              this.selectorOptions[0].push(j)
            }
          } else if (padItems[i].name == 'Super Wings' ||
            padItems[i].id == 'PS') {
            this.padsAmount[1] = padItems[i].amount
            this.selectorOptions[1] = []
            for (let j = 0; j <= padItems[i].amount; j++) {
              this.selectorOptions[1].push(j)
            }
          } else if (padItems[i].id == 'PMR') {
            this.padsAmount[2] = padItems[i].amount
            this.selectorOptions[2] = []
            for (let j = 0; j <= padItems[i].amount; j++) {
              this.selectorOptions[2].push(j)
            }
          } else if (padItems[i].id == 'PMS') {
            this.padsAmount[3] = padItems[i].amount
            this.selectorOptions[3] = []
            for (let j = 0; j <= padItems[i].amount; j++) {
              this.selectorOptions[3].push(j)
            }
          }
        }
        this.amountPadsSelected = this.padsAmount.reduce((acc, cur) => acc + cur, 0);
      }
      if (this.selectedProducts.tampons) {
        var tamponItems = this.selectedProducts.tampons
        for (let i = 0; i < tamponItems.length; i++) {
          if (tamponItems[i].name == 'Regular' ||
            tamponItems[i].id == 'TR') {
            this.tamponAmount[0] = tamponItems[i].amount
            this.selectorOptions[4] = []
            for (let j = 0; j <= tamponItems[i].amount; j++) {
              this.selectorOptions[4].push(j)
            }
          } else if (tamponItems[i].name == 'Super' ||
            tamponItems[i].id == 'TS') {
            this.tamponAmount[1] = tamponItems[i].amount
            this.selectorOptions[5] = []
            for (let j = 0; j <= tamponItems[i].amount; j++) {
              this.selectorOptions[5].push(j)
            }
          } else if (tamponItems[i].name == 'Super Plus' ||
            tamponItems[i].id == 'TSP') {
            this.tamponAmount[2] = tamponItems[i].amount
            this.selectorOptions[6] = []
            for (let j = 0; j <= tamponItems[i].amount; j++) {
              this.selectorOptions[6].push(j)
            }
          }
        }
      }
      if (this.selectedProducts.liners) {
        var linersItems = this.selectedProducts.liners
        for (let i = 0; i < linersItems.length; i++) {
          if (linersItems[i].id == 'LL') {
            this.linersAmount[0] = linersItems[i].amount
            this.selectorOptions[7] = []
            for (let j = 0; j <= linersItems[i].amount; j++) {
              this.selectorOptions[7].push(j)
            }
          } else if (linersItems[i].id == 'LEL') {
            this.linersAmount[1] = linersItems[i].amount
            this.selectorOptions[8] = []
            for (let j = 0; j <= linersItems[i].amount; j++) {
              this.selectorOptions[8].push(j)
            }
          }
        }
      }
      var tamponAmount = this.tamponAmount.reduce((acc, cur) => acc + cur, 0);
      var linersAmount = this.linersAmount.reduce((acc, cur) => acc + cur, 0);
      this.amountProductsSelected = tamponAmount + linersAmount + this.amountPadsSelected;

      // Give remaining 'rest' to others
      var rest = this.maxAmountProducts - this.amountProductsSelected
      var restPads = this.maxPads - this.amountPadsSelected
      if (rest > 0) {
        for (let i = 0; i < this.selectorOptions.length; i++) {
          if (i < this.productTypeAmounts.pads) {
            if (this.padsAmount[i] > 1) {
              //console.log(i, restPads, 'add remaining to existing:', this.selectorOptions[i])
              var index = this.selectorOptions[i].length - 1
              var restPlus = this.selectorOptions[i][index] + restPads

              if (restPads > rest) {
                var toRemove = restPads - rest
                restPlus = restPlus - toRemove
              }

              this.selectorOptions[i] = []
              for (let j = 0; j <= restPlus; j++) {
                this.selectorOptions[i].push(j)
              }
            } else {
              if (restPads != 0) {
                //console.log(i, rest, 'add remaining')
                this.selectorOptions[i] = []
                for (let j = 0; j <= restPads; j++) {
                  this.selectorOptions[i].push(j)
                }
              }
            }
          } else {
            var tamponIndex = i - this.productTypeAmounts.pads
            var linerIndex = i - this.productTypeAmounts.pads - this.productTypeAmounts.tampons
            //console.log(tamponIndex, this.tamponAmount[tamponIndex], linerIndex, this.linersAmount[linerIndex])
            if (tamponIndex < 3 && this.tamponAmount[tamponIndex] > 1) {
              //console.log(i, rest, 'add tampon remaining to existing:', this.selectorOptions[i])
              var index = this.selectorOptions[i].length - 1
              var restPlus = this.selectorOptions[i][index] + rest
              this.selectorOptions[i] = []
              for (let j = 0; j <= restPlus; j++) {
                this.selectorOptions[i].push(j)
              }
            // deepcode ignore DuplicateIfBody: <please specify a reason of ignoring this>
            } else if (linerIndex >= 0 && this.linersAmount[linerIndex] > 1) {
              //console.log(i, rest, 'add liner remaining to existing:', this.selectorOptions[i])
              var index = this.selectorOptions[i].length - 1
              var restPlus = this.selectorOptions[i][index] + rest
              this.selectorOptions[i] = []
              for (let j = 0; j <= restPlus; j++) {
                this.selectorOptions[i].push(j)
              }
            } else {
              //console.log(i, rest, 'add remaining')
              this.selectorOptions[i] = []
              for (let j = 0; j <= rest; j++) {
                this.selectorOptions[i].push(j)
              }
            }
          }
        }
      }
    }

    // Extra products
    if (this.editMode && this.selectedProducts.extraProducts != null ||
      this.recovered && this.selectedProducts.extraProducts != null) {
      if (this.selectedProducts.extraProducts.pads) {
        this.extraPads = true
        var padItems = this.selectedProducts.extraProducts.pads
        for (let i = 0; i < padItems.length; i++) {
          if (padItems[i].name == 'Regular Wings' ||
            padItems[i].id == 'PR') {
            this.padsExtraAmount[0] = padItems[i].amount
            this.selectorExtraOptions[0] = []
            for (let j = 0; j <= padItems[i].amount; j++) {
              this.selectorExtraOptions[0].push(j)
            }
          } else if (padItems[i].name == 'Super Wings' ||
            padItems[i].id == 'PS') {
            this.padsExtraAmount[1] = padItems[i].amount
            this.selectorExtraOptions[1] = []
            for (let j = 0; j <= padItems[i].amount; j++) {
              this.selectorExtraOptions[1].push(j)
            }
          } else if (padItems[i].id == 'PMR') {
            this.padsExtraAmount[2] = padItems[i].amount
            this.selectorExtraOptions[2] = []
            for (let j = 0; j <= padItems[i].amount; j++) {
              this.selectorExtraOptions[2].push(j)
            }
          } else if (padItems[i].id == 'PMS') {
            this.padsExtraAmount[3] = padItems[i].amount
            this.selectorExtraOptions[3] = []
            for (let j = 0; j <= padItems[i].amount; j++) {
              this.selectorExtraOptions[3].push(j)
            }
          }
        }
        this.amountExtraPadsSelected = this.padsExtraAmount.reduce((acc, cur) => acc + cur, 0);
      }
      if (this.selectedProducts.extraProducts.tampons) {
        this.extraTampons = true
        var tamponItems = this.selectedProducts.extraProducts.tampons
        for (let i = 0; i < tamponItems.length; i++) {
          if (tamponItems[i].name == 'Regular' ||
            tamponItems[i].id == 'TR') {
            this.tamponsExtraAmount[0] = tamponItems[i].amount
            this.selectorExtraOptions[4] = []
            for (let j = 0; j <= tamponItems[i].amount; j++) {
              this.selectorExtraOptions[4].push(j)
            }
          } else if (tamponItems[i].name == 'Super' ||
            tamponItems[i].id == 'TS') {
            this.tamponsExtraAmount[1] = tamponItems[i].amount
            this.selectorExtraOptions[5] = []
            for (let j = 0; j <= tamponItems[i].amount; j++) {
              this.selectorExtraOptions[5].push(j)
            }
          } else if (tamponItems[i].name == 'Super Plus' ||
            tamponItems[i].id == 'TSP') {
            this.tamponsExtraAmount[2] = tamponItems[i].amount
            this.selectorExtraOptions[6] = []
            for (let j = 0; j <= tamponItems[i].amount; j++) {
              this.selectorExtraOptions[6].push(j)
            }
          }
        }
        this.amountExtraTamponsSelected = this.tamponsExtraAmount.reduce((acc, cur) => acc + cur, 0);
      }
      if (this.selectedProducts.extraProducts.liners) {
        this.extraLiners = true
        var linersItems = this.selectedProducts.extraProducts.liners
        for (let i = 0; i < linersItems.length; i++) {
          if (linersItems[i].id == 'LL') {
            this.linersExtraAmount[0] = linersItems[i].amount
            this.selectorExtraOptions[7] = []
            for (let j = 0; j <= linersItems[i].amount; j++) {
              this.selectorExtraOptions[7].push(j)
            }
          } else if (linersItems[i].id == 'LEL') {
            this.linersExtraAmount[1] = linersItems[i].amount
            this.selectorExtraOptions[8] = []
            for (let j = 0; j <= linersItems[i].amount; j++) {
              this.selectorExtraOptions[8].push(j)
            }
          }
        }
        this.amountExtraLinersSelected = this.linersExtraAmount.reduce((acc, cur) => acc + cur, 0);
      }
      this.amountExtraProductsSelected = this.amountExtraTamponsSelected + this.amountExtraLinersSelected + this.amountExtraPadsSelected;

      // Give remaining 'rest' to others
      var restExtraTampons = this.maxExtraTampons - this.amountExtraTamponsSelected
      var restExtraPads = this.maxExtraPads - this.amountExtraPadsSelected
      var restExtraLiners = this.maxExtraLiners - this.amountExtraLinersSelected
      var loopAmount = this.productTypeAmounts.pads + this.productTypeAmounts.tampons + this.productTypeAmounts.liners
      for (let i = 0; i < loopAmount; i++) {
        if (i < this.productTypeAmounts.pads) {
          if (this.padsExtraAmount[i] > 1) {
            //console.log(i, restPads, 'add remaining to existing:', this.selectorOptions[i])
            var index = this.selectorExtraOptions[i].length - 1
            var restPlus = this.selectorExtraOptions[i][index] + restExtraPads

            if (restExtraPads > rest) {
              var toRemove = restExtraPads - rest
              restPlus = restPlus - toRemove
            }

            this.selectorExtraOptions[i] = []
            for (let j = 0; j <= restPlus; j++) {
              this.selectorExtraOptions[i].push(j)
            }
          } else {
            if (restExtraPads != 0) {
              //console.log(i, rest, 'add remaining')
              this.selectorExtraOptions[i] = []
              for (let j = 0; j <= restExtraPads; j++) {
                this.selectorExtraOptions[i].push(j)
              }
            }
          }
        } else {
          var tamponExtraIndex = i - this.productTypeAmounts.pads
          var linerExtraIndex = i - this.productTypeAmounts.pads - this.productTypeAmounts.tampons
          //console.log(tamponExtraIndex, this.tamponsExtraAmount[tamponExtraIndex], linerExtraIndex, this.linersExtraAmount[linerExtraIndex])
          if (tamponExtraIndex < 3 && this.tamponsExtraAmount[tamponExtraIndex] > 1) {
            //console.log(i, rest, 'add tampon remaining to existing:', this.selectorExtraOptions[i])
            var index = this.selectorExtraOptions[i].length - 1
            var restPlus = this.selectorExtraOptions[i][index] + restExtraTampons
            this.selectorExtraOptions[i] = []
            for (let j = 0; j <= restPlus; j++) {
              this.selectorExtraOptions[i].push(j)
            }
          } else if (linerExtraIndex >= 0 && this.linersExtraAmount[linerExtraIndex] > 1) {
            //console.log(i, rest, 'add liner remaining to existing:', this.selectorExtraOptions[i])
            var index = this.selectorExtraOptions[i].length - 1
            var restPlus = this.selectorExtraOptions[i][index] + restExtraLiners
            this.selectorExtraOptions[i] = []
            for (let j = 0; j <= restPlus; j++) {
              this.selectorExtraOptions[i].push(j)
            }
          } else {
            //console.log(i, restExtraTampons, restExtraLiners, 'add remaining')
            var fill = linerExtraIndex >= 0 ? restExtraLiners : restExtraTampons
            this.selectorExtraOptions[i] = []
            for (let j = 0; j <= fill; j++) {
              this.selectorExtraOptions[i].push(j)
            }
          }
        }
      }
    }

    if (isDevMode()) {
      console.log('selectOptions', this.selectorOptions, this.selectorExtraOptions)
    }
  }

  fillModalInfo(index: number, type: string) {
    if (type == "tampons") {
      this.modalInfo = this.productTampon[index];
      this.modalProductImage = this.productTampon[index].image;
    } else if (type == "pads") {
      this.modalInfo = this.productPads[index];
      this.modalProductImage = this.productPads[index].image;
    } else if (type == "liners") {
      this.modalInfo = this.productLiners[index];
      this.modalProductImage = this.productLiners[index].image;
    }

    this.dialog.open(ProductDetailDialog, {
      width: '600px',
      data: {
        dialogInfo: this.modalInfo,
        dialogImage: this.modalProductImage
      }
    });
  }

  passProductData() {
    if (!this.editMode) {
      this.orderbox.updateProducts(this.productsToMap(), this.amountProductsSelected, this.amountExtraProductsSelected)
    } else {
      this.editproducts.updateProducts(this.productsToMap(), this.amountProductsSelected, this.amountExtraProductsSelected)
    }
  }

  productsToMap() {
    // Reset
    this.selectedProducts.extraProducts = null
    this.selectedProducts.tampons = null
    this.selectedProducts.pads = null
    this.selectedProducts.liners = null
    var extraPrice = 0

    // Tampons
    var tamponsArray = [];
    for (let i = 0; i < this.tamponAmount.length; i++) {
      if (this.tamponAmount[i] != 0) {
        var item = {
          id: this.productTampon[i].id,
          brand: this.productTampon[i].brand,
          name: this.productTampon[i].name,
          amount: this.tamponAmount[i]
        }
        tamponsArray.push(item);
      }
    }
    // Pads
    var padsArray = [];
    for (let i = 0; i < this.padsAmount.length; i++) {
      if (this.padsAmount[i] != 0) {
        var item = {
          id: this.productPads[i].id,
          brand: this.productPads[i].brand,
          name: this.productPads[i].name,
          amount: this.padsAmount[i]
        }
        padsArray.push(item);
      }
    }
    // Liners
    var linersArray = [];
    for (let i = 0; i < this.linersAmount.length; i++) {
      if (this.linersAmount[i] != 0) {
        var item = {
          id: this.productLiners[i].id,
          brand: this.productLiners[i].brand,
          name: this.productLiners[i].name,
          amount: this.linersAmount[i]
        }
        linersArray.push(item);
      }
    }
    // Extra Tampons
    var tamponsExtraArray = [];
    for (let i = 0; i < this.tamponsExtraAmount.length; i++) {
      if (this.tamponsExtraAmount[i] != 0) {
        var extraItem = {
          id: this.productTampon[i].id,
          brand: this.productTampon[i].brand,
          name: this.productTampon[i].name,
          price: (this.tamponsExtraAmount[i] * this.productTampon[i].price),
          amount: this.tamponsExtraAmount[i]
        }
        tamponsExtraArray.push(extraItem);
        extraPrice = extraPrice + extraItem.price
      }
    }
    // Extra Pads
    var padsExtraArray = [];
    for (let i = 0; i < this.padsExtraAmount.length; i++) {
      if (this.padsExtraAmount[i] != 0) {
        var extraItem = {
          id: this.productPads[i].id,
          brand: this.productPads[i].brand,
          name: this.productPads[i].name,
          price: (this.padsExtraAmount[i] * this.productPads[i].price),
          amount: this.padsExtraAmount[i]
        }
        padsExtraArray.push(extraItem);
        extraPrice = extraPrice + extraItem.price
      }
    }
    // Extra Liners
    var linersExtraArray = [];
    for (let i = 0; i < this.linersExtraAmount.length; i++) {
      if (this.linersExtraAmount[i] != 0) {
        var extraItem = {
          id: this.productLiners[i].id,
          brand: this.productLiners[i].brand,
          name: this.productLiners[i].name,
          price: (this.linersExtraAmount[i] * this.productLiners[i].price),
          amount: this.linersExtraAmount[i]
        }
        linersExtraArray.push(extraItem);
        extraPrice = extraPrice + extraItem.price
      }
    }

    if (tamponsArray.length != 0) {
      this.selectedProducts.tampons = tamponsArray
    }
    if (padsArray.length != 0) {
      this.selectedProducts.pads = padsArray
    }
    if (linersArray.length != 0) {
      this.selectedProducts.liners = linersArray
    }
    if (tamponsExtraArray.length != 0 || padsExtraArray.length != 0 || linersExtraArray.length != 0) {
      this.selectedProducts.extraProducts = {
        extraPrice: extraPrice,
        tampons: tamponsExtraArray.length != 0 ? tamponsExtraArray : null,
        pads: padsExtraArray.length != 0 ? padsExtraArray : null,
        liners: linersExtraArray.length != 0 ? linersExtraArray : null
      }
    }
    return this.selectedProducts;
  }

  onChange(index, newValue, type: string) {
    let difference;
    let mainIndex = index
    if (type == "pads") {
      difference = newValue - this.padsAmount[index];
      this.padsAmount[index] = newValue;
    } else if (type == "tampons") {
      mainIndex = index + this.productTypeAmounts.pads;
      difference = newValue - this.tamponAmount[index];
      this.tamponAmount[index] = newValue;
    } else if (type == "liners") {
      mainIndex = index + this.productTypeAmounts.pads + this.productTypeAmounts.tampons;
      difference = newValue - this.linersAmount[index];
      this.linersAmount[index] = newValue;
    }
    //console.log('difference', difference, '|', newValue, this.padsAmount[index])
    this.getCurrentCount()
    this.fillSelectOnChange(mainIndex, difference)
    this.passProductData()

    if (this.amountProductsSelected != this.maxAmountProducts) {
      this.resetExtraSelectors()
    }
  }

  onChangeExtra(index, newValue, type: string) {
    let difference;
    if (type == "tampons") {
      difference = newValue - this.tamponsExtraAmount[index];
      this.tamponsExtraAmount[index] = newValue;
    } else if (type == "pads") {
      difference = newValue - this.padsExtraAmount[index];
      this.padsExtraAmount[index] = newValue;
    } else if (type == "liners") {
      difference = newValue - this.linersExtraAmount[index];
      this.linersExtraAmount[index] = newValue;
    }
    //console.log('difference', difference, '|', newValue, this.tamponsExtraAmount[index], this.padsExtraAmount[index], this.linersExtraAmount[index])
    this.getCurrentCount()
    this.fillExtraSelectOnChange(index, type, difference)
    //console.log('selectExtraOptions', this.selectorExtraOptions)
    this.passProductData()
  }

  fillSelectOnChange(index: number, difference: number) {
    let loopLength = this.selectorOptions.length;
    let amountToFill;
    var size;
    amountToFill = this.maxAmountProducts - this.amountProductsSelected;
    for (let mainIndex = 0; mainIndex < loopLength; mainIndex++) {
      if (mainIndex < this.productTypeAmounts.pads) {
        // Pads (index 0-3)
        let padIndex = mainIndex;
        //console.log('loopIndex: ' + mainIndex, 'pads', padIndex, 'selectorIndex: ' + index, difference, amountToFill, this.amountProductsSelected, this.maxPads)
        var padsToFill = amountToFill;
        if (this.amountPadsSelected == 0 && this.amountProductsSelected < (this.maxAmountProducts - this.maxPads)) {
          // If no pads selected
          padsToFill = this.maxPads
          //console.log('A', this.amountPadsSelected, padsToFill)
        } else if (index < this.productTypeAmounts.pads && (amountToFill - (this.maxAmountProducts - this.maxPads)) >= 0) {
          // Special amountToFill
          if (this.boxTypeId == 'box_01' || this.maxPads == this.maxAmountProducts) {
            padsToFill = this.maxPads - this.amountProductsSelected
          } else {
            padsToFill = this.maxPads - this.amountPadsSelected
          }
          //console.log('B', this.amountPadsSelected, padsToFill)
        } else if (index >= this.productTypeAmounts.pads) {
          // Special amountToFill
          var remainingPads = this.maxPads - this.amountPadsSelected
          if (amountToFill < remainingPads) {
            padsToFill = amountToFill
          } else {
            padsToFill = remainingPads
          }
          //console.log('C', this.amountPadsSelected, padsToFill, amountToFill, remainingPads)
        } else {
          // Regular amountToFill
          padsToFill = amountToFill
          //console.log('D', this.amountPadsSelected, padsToFill)
        }
        //console.log('padsselected', this.amountPadsSelected, padsToFill)

        if (mainIndex != index) {
          if (this.padsAmount[padIndex] == 0) {
            //console.log('path', padsToFill, (this.maxAmountProducts - this.maxPads), this.maxAmountProducts, this.maxPads)
            if (this.selectorOptions[mainIndex].length != 1 || difference < 0 && this.maxPads != this.amountPadsSelected) {
              //console.log('here1')
              this.selectorOptions[mainIndex] = [];
              for (let j = 0; j <= padsToFill; j++) {
                this.selectorOptions[mainIndex].push(j)
              }
            }
          } else {
            if (difference > 0) {
              if (index < this.productTypeAmounts.pads) {
                //console.log('here3', difference)
                for (let d = 0; d < difference; d++) {
                  this.selectorOptions[mainIndex].pop()
                }
              } else {
                var selectorAmount = this.selectorOptions[mainIndex].length - 1
                var selectorRest = selectorAmount - this.padsAmount[padIndex]

                if (selectorRest > amountToFill) {
                  var toRemove = selectorRest - amountToFill
                  if (toRemove < 0) {
                    toRemove = difference
                  }
                  //console.log('here5', toRemove)
                  for (let d = 0; d < toRemove; d++) {
                    this.selectorOptions[mainIndex].pop()
                  }
                } else if (difference > selectorRest) {
                  var toRemove = selectorRest - difference
                  //console.log('here4', toRemove, selectorAmount, selectorRest, difference, amountToFill)
                  for (let d = 0; d < toRemove; d++) {
                    this.selectorOptions[mainIndex].pop()
                  }
                }
              }
            } else if (difference < 0 && this.maxPads != this.amountPadsSelected) {
              var selectorAmount = this.selectorOptions[mainIndex].length - 1
              var selectorRest = this.amountPadsSelected - this.padsAmount[padIndex]
              //console.log('here6', selectorAmount, selectorRest, this.maxPads)
              if (selectorAmount + selectorRest != this.maxPads) {
                size = this.maxPads - selectorRest
                //console.log('index: ' + mainIndex, 'size:' + size, this.padsAmount[padIndex], difference, (this.selectorOptions[mainIndex].length - 1))

                this.selectorOptions[mainIndex] = [];
                for (let j = 0; j <= size; j++) {
                  this.selectorOptions[mainIndex].push(j)
                }
              }
            }
          }
        }
      } else if (mainIndex < this.productTypeAmounts.pads + this.productTypeAmounts.tampons) {
        // Tampons (4-6)
        let tamponsIndex = mainIndex - this.productTypeAmounts.pads;
        //console.log('tampons', mainIndex, index, difference, amountToFill, this.tamponAmount[mainIndex])
        if (this.tamponAmount[tamponsIndex] == 0) {
          this.selectorOptions[mainIndex] = [];
          for (let j = 0; j <= amountToFill; j++) {
            this.selectorOptions[mainIndex].push(j)
          }
        } else {
          if (mainIndex != index) {
            if (difference > 0) {
              for (let p = 0; p < difference; p++) {
                this.selectorOptions[mainIndex].pop()
              }
            } else {
              size = (this.selectorOptions[mainIndex].length - 1) - difference
              //console.log('size:' + size, this.selectorOptions[mainIndex], difference)
              this.selectorOptions[mainIndex] = [];
              for (let j = 0; j <= size; j++) {
                this.selectorOptions[mainIndex].push(j)
              }
            }
          }
        }
      } else {
        // Liners (7-8)
        let linersIndex = mainIndex - (this.productTypeAmounts.tampons + this.productTypeAmounts.pads);
        if (this.linersAmount[linersIndex] == 0) {
          this.selectorOptions[mainIndex] = [];
          for (let j = 0; j <= amountToFill; j++) {
            this.selectorOptions[mainIndex].push(j)
          }
        } else {
          if (mainIndex != index) {
            if (difference > 0) {
              for (let p = 0; p < difference; p++) {
                this.selectorOptions[mainIndex].pop()
              }
            } else {
              size = (this.selectorOptions[mainIndex].length - 1) - difference
              //console.log('size:' + size, this.selectorOptions[mainIndex], difference)
              this.selectorOptions[mainIndex] = [];
              for (let j = 0; j <= size; j++) {
                this.selectorOptions[mainIndex].push(j)
              }
            }
          }
        }
      }
    }
    if (isDevMode()) {
      console.log('selectOptions', this.selectorOptions)
    }
  }

  fillExtraSelectOnChange(index: number, type: string, difference: number) {
    let loopLength = this.productTypeAmounts.pads + this.productTypeAmounts.tampons + this.productTypeAmounts.liners;
    var size;
    let amountToFillTampons = this.maxExtraTampons - this.amountExtraTamponsSelected;
    let amountToFillPads = this.maxExtraPads - this.amountExtraPadsSelected;
    for (let mainIndex = 0; mainIndex < loopLength; mainIndex++) {
      // Pads (index 0-3)
      if (type == 'pads' && mainIndex < this.productTypeAmounts.pads) {
        let padIndex = mainIndex;
        //console.log('pads', mainIndex, padIndex, index, difference, amountToFillPads)
        if (padIndex != index) {
          if (difference > 0) {
            for (let p = 0; p < difference; p++) {
              this.selectorExtraOptions[mainIndex].pop()
            }
          } else {
            size = (this.selectorExtraOptions[mainIndex].length - 1) - difference
            //console.log('size:' + size, this.selectorExtraOptions[mainIndex], difference)
            this.selectorExtraOptions[mainIndex] = [];
            for (let j = 0; j <= size; j++) {
              this.selectorExtraOptions[mainIndex].pop(j)
            }
          }
        }
      }
      // Tampons (index 4-6)
      if (type == 'tampons' && mainIndex < this.productTypeAmounts.pads + this.productTypeAmounts.tampons) {
        let tamponIndex = mainIndex - this.productTypeAmounts.pads;
        //console.log('tampons', mainIndex, index, difference, amountToFillTampons, this.tamponAmount[mainIndex])
        if (tamponIndex != index) {
          if (difference > 0) {
            for (let p = 0; p < difference; p++) {
              this.selectorExtraOptions[mainIndex].pop()
            }
          } else {
            size = (this.selectorExtraOptions[mainIndex].length - 1) - difference
            //console.log('size:' + size, this.selectorOptions[mainIndex], difference)
            this.selectorExtraOptions[mainIndex] = [];
            for (let j = 0; j <= size; j++) {
              this.selectorExtraOptions[mainIndex].push(j)
            }
          }
        }
      }
      // Liners (index 7-8)
      if (type == 'liners' && mainIndex > this.productTypeAmounts.pads + this.productTypeAmounts.tampons) {
        let linersIndex = mainIndex - this.productTypeAmounts.pads - this.productTypeAmounts.tampons;
        if (isDevMode()) {
          console.log('liners', linersIndex, mainIndex, index, difference, this.linersExtraAmount[mainIndex])
        }
        if (linersIndex != index) {
          if (difference > 0) {
            for (let p = 0; p < difference; p++) {
              this.selectorExtraOptions[mainIndex].pop()
            }
          } else {
            size = (this.selectorExtraOptions[mainIndex].length - 1) - difference
            //console.log('size:' + size, this.selectorOptions[mainIndex], difference)
            this.selectorExtraOptions[mainIndex] = [];
            for (let j = 0; j <= size; j++) {
              this.selectorExtraOptions[mainIndex].push(j)
            }
          }
        }
      }
    }
  }

  fillSelectors() {
    const selectorSize = this.productTypeAmounts.pads + this.productTypeAmounts.tampons + this.productTypeAmounts.liners

    for (let i = 0; i < selectorSize; i++) {
      this.selectorOptions[i] = [];
      if (i < this.productTypeAmounts.pads) {
        for (let j = 0; j <= this.maxPads; j++) {
          this.selectorOptions[i].push(j);
        }
      } else {
        for (let j = 0; j <= this.maxAmountProducts; j++) {
          this.selectorOptions[i].push(j);
        }
      }
    }

    if (isDevMode()) {
      console.log('selectOptions', this.selectorOptions)
    }
  }

  fillExtraSelectors(type: string) {
    if (type == 'pads') {
      for (let i = 0; i < this.productTypeAmounts.pads; i++) {
        this.selectorExtraOptions[i] = [];
        for (let j = 0; j <= this.maxExtraPads; j++) {
          this.selectorExtraOptions[i].push(j)
        }
      }
    } else if (type == 'tampons') {
      for (let i = this.productTypeAmounts.pads; i < this.productTypeAmounts.pads + this.productTypeAmounts.tampons; i++) {
        this.selectorExtraOptions[i] = [];
        for (let j = 0; j <= this.maxExtraTampons; j++) {
          this.selectorExtraOptions[i].push(j)
        }
      }
    } else if (type == 'liners') {
      for (let i = this.productTypeAmounts.pads + this.productTypeAmounts.tampons; i < this.productTypeAmounts.pads + this.productTypeAmounts.tampons + this.productTypeAmounts.liners; i++) {
        this.selectorExtraOptions[i] = [];
        for (let j = 0; j <= this.maxExtraTampons; j++) {
          this.selectorExtraOptions[i].push(j)
        }
      }
    }
  }

  changeStatus(type, event: any) {
    if (type == 'tampons') {
      if (event.checked) {
        this.extraTampons = true
        this.fillExtraSelectors(type)
        if (isDevMode()) {
          console.log(this.tamponsExtraAmount, this.selectorExtraOptions)
        }
      } else {
        this.extraTampons = false
        this.resetExtraSelectors()
      }
    } else if (type == 'pads') {
      if (event.checked) {
        this.extraPads = true
        this.fillExtraSelectors(type)
        if (isDevMode()) {
          console.log(this.padsExtraAmount, this.selectorExtraOptions)
        }
      } else {
        this.extraPads = false
        this.resetExtraSelectors()
      }
    } else if (type == 'liners') {
      if (event.checked) {
        this.extraLiners = true
        this.fillExtraSelectors(type)
        if (isDevMode()) {
          console.log(this.linersExtraAmount, this.selectorExtraOptions)
        }
      } else {
        this.extraLiners = false
        this.resetExtraSelectors()
      }
    } else if (type == 'removeBuds') {
      if (event.checked) {
        this.maxPads = this.maxAmountProducts
        let amountToFill;
        var maxPads = this.maxPads;
        amountToFill = this.maxAmountProducts - this.amountProductsSelected;
        var padsToFill = amountToFill;
        if (amountToFill > (this.maxAmountProducts - maxPads)) {
          padsToFill = amountToFill - (this.maxAmountProducts - maxPads);
        } else if (amountToFill > (maxPads - this.amountPadsSelected)) {
          padsToFill = (maxPads - this.amountPadsSelected);
        }
        //console.log(padsToFill, this.amountPadsSelected);
        for (let i = 0; i < this.productTypeAmounts.pads; i++) {
          if (this.padsAmount[i] == 0) {
            this.selectorOptions[i] = []
            for (let j = 0; j <= padsToFill; j++) {
              this.selectorOptions[i].push(j)
            }
          } else {
            this.selectorOptions[i] = []
            var toFill = this.padsAmount[i] + padsToFill
            for (let j = 0; j <= toFill; j++) {
              this.selectorOptions[i].push(j)
            }
          }
        }
        if (isDevMode()) {
          console.log('selectOptions', this.selectorOptions)
        }
      } else {
        if (this.boxTypeId == 'box_02' || this.boxTypeId == 'box_03') {
          this.maxPads = this.products.padsMaxAmount
        }
        this.resetSelectors()
      }
    }
    this.passProductData()
  }

  disableCheckbox(type: string) {
    if (type == 'pads') {
      if (this.selectedProducts.pads == null || this.selectedProducts.pads != null &&
        this.amountProductsSelected != this.maxAmountProducts || this.amountPadsSelected != this.maxPads) {
        return true;
      } else {
        return false;
      }
    } else if (type == 'tampons') {
      if (this.selectedProducts.tampons == null || this.selectedProducts.tampons != null &&
        this.amountProductsSelected != this.maxAmountProducts) {
        return true;
      } else {
        return false;
      }
    } else if (type == 'liners') {
      if (this.selectedProducts.liners == null || this.selectedProducts.liners != null &&
        this.amountProductsSelected != this.maxAmountProducts) {
        return true;
      } else {
        return false;
      }
    }
  }

  resetSelectors() {
    // this.amountProductsSelected = 0;
    // this.amountPadsSelected = 0;
    this.selectorOptions = [[0], [0], [0], [0], [0], [0], [0]];
    //this.tamponAmount = [0, 0, 0];
    //this.padsAmount = [0, 0, 0, 0];
    this.fillSelectors()
  }

  resetExtraSelectors() {
    this.extraTampons = false
    this.extraPads = false
    this.extraLiners = false
    // this.amountExtraProductsSelected = 0;
    // this.amountExtraTamponsSelected = 0;
    // this.amountExtraPadsSelected = 0;
    // this.amountExtraLinersSelected = 0;
    this.selectorExtraOptions = [[0], [0], [0], [0], [0], [0], [0]];
    this.tamponsExtraAmount = [0, 0, 0];
    this.padsExtraAmount = [0, 0, 0, 0];
    this.linersExtraAmount = [0, 0];
    this.passProductData()
  }

  getCurrentCount() {
    var amountProducts = 0;
    var amountPads = 0;
    var amountLiners = 0;
    var amountExtraProducts = 0;
    var amountExtraTampons = 0;
    var amountExtraPads = 0;
    var amountExtraLiners = 0;
    for (let i = 0; i < this.tamponAmount.length; i++) {
      amountProducts = amountProducts + this.tamponAmount[i];
    }
    for (let i = 0; i < this.padsAmount.length; i++) {
      amountPads = amountPads + this.padsAmount[i];
      amountProducts = amountProducts + this.padsAmount[i];
    }
    for (let i = 0; i < this.linersAmount.length; i++) {
      amountLiners = amountLiners + this.linersAmount[i];
      amountProducts = amountProducts + this.linersAmount[i];
    }
    for (let i = 0; i < this.tamponsExtraAmount.length; i++) {
      amountExtraTampons = amountExtraTampons + this.tamponsExtraAmount[i];
      amountExtraProducts = amountExtraProducts + this.tamponsExtraAmount[i];
    }
    for (let i = 0; i < this.padsExtraAmount.length; i++) {
      amountExtraPads = amountExtraPads + this.padsExtraAmount[i];
      amountExtraProducts = amountExtraProducts + this.padsExtraAmount[i];
    }
    for (let i = 0; i < this.linersExtraAmount.length; i++) {
      amountExtraLiners = amountExtraLiners + this.linersExtraAmount[i];
      amountExtraProducts = amountExtraProducts + this.linersExtraAmount[i];
    }
    if (isDevMode()) {
      console.log(amountProducts)
    }
    this.amountProductsSelected = amountProducts;
    this.amountPadsSelected = amountPads;
    this.amountExtraProductsSelected = amountExtraProducts;
    this.amountExtraTamponsSelected = amountExtraTampons;
    this.amountExtraPadsSelected = amountExtraPads;
  }

  continueToDelivery() {
    this.router.navigate(['/order-box/' + this.boxType.name.toLowerCase() + '/delivery'], { state: { products: this.productsToMap() } });
  }

}
