import * as React from 'react'

interface IProductsListProps {
  productIds: any;
}

const ProductsList = (props: IProductsListProps) => {
  const listElements =
    props.productIds && 
    props.productIds.map((id: number) => <li key={id.toString()}>Product Id: {id.toString()}</li>)

  return (
    <div>
      <strong>Available Products</strong>
      <ul>{listElements}</ul>
    </div>
  );
}

export default ProductsList
