# new Prices format for solar products page

### requirments : 
- factory price: 
- factor: three options (1,17, 1,30, 1,35) and free input factor 
        - factor value need validation to ensure its based factored
- cost price = factory price * factor

### selling prices : 
- Toptan price: whole sale price (take the cost price and * 1,8)
- maximum price we can sell while the boss is not around: (take the cost price and * 1,9)
- normal selling price: the base price for quantity 1 or 2 (take the cost price and * 2)

### neondb megration needed : 

[x] change the columns names
    first_price --> factory_price
    second_price --> wholesale_price
    third_price --> min_selling_price
    four_price --> selling_price
 
[x] delete the price column

[x] add "factor" column

[x] add "cost_price" column

### final prices db model

factory_price {numeric(10,2)}
wholesale_price {numeric(10,2)}
min_selling_price {numeric(10,2)}
selling_price {numeric(10,2)}
factor {float}
cost_price {numeric{10,2}}


