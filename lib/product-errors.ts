export class ProductCreationAcknowledgedError extends Error {
  readonly code = 'PRODUCT_CREATED_READ_UNAVAILABLE'
  constructor(readonly productId: string) {
    super('Produit enregistré. Sa fiche est momentanément indisponible. Consultez le catalogue avant de créer un autre produit.')
    this.name = 'ProductCreationAcknowledgedError'
  }
}
