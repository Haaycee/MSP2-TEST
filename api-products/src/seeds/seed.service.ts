import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../products/entities/product.entity';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async seedProducts() {
    // Check if products already exist
    const existingProducts = await this.productRepository.count();
    if (existingProducts > 0) {
      console.log('Products already exist, skipping seed...');
      return;
    }

    const coffeeProducts = [
      {
        label: 'Espresso Classique',
        description: 'Un espresso authentique aux arômes intenses et à la crème onctueuse. Parfait pour commencer la journée avec énergie.',
        price: 2.50,
        stock: 150,
      },
      {
        label: 'Café Allongé',
        description: 'Espresso allongé avec de l\'eau chaude, offrant une saveur douce et équilibrée pour les amateurs de café moins corsé.',
        price: 2.80,
        stock: 120,
      },
      {
        label: 'Cappuccino Traditionnel',
        description: 'Mélange parfait d\'espresso, de lait vapeur et de mousse de lait, saupoudré de cacao en poudre.',
        price: 3.50,
        stock: 100,
      },
      {
        label: 'Latte Macchiato',
        description: 'Café latte onctueux avec une généreuse quantité de lait chaud et une délicate couche de mousse.',
        price: 4.00,
        stock: 80,
      },
      {
        label: 'Café Noisette',
        description: 'Espresso servi avec une pointe de lait chaud, créant une boisson douce aux notes subtiles.',
        price: 2.70,
        stock: 90,
      },
      {
        label: 'Mocha Chocolat',
        description: 'Délicieux mélange d\'espresso, de chocolat chaud et de lait vapeur, couronné de chantilly.',
        price: 4.50,
        stock: 60,
      },
      {
        label: 'Café Viennois',
        description: 'Café noir traditionnel surmonté d\'une généreuse portion de crème fouettée et saupoudré de chocolat.',
        price: 3.80,
        stock: 70,
      },
      {
        label: 'Café Glacé Vanille',
        description: 'Café froid rafraîchissant avec des glaçons, du lait et un soupçon de sirop de vanille.',
        price: 3.20,
        stock: 85,
      },
      {
        label: 'Ristretto Intense',
        description: 'Version concentrée de l\'espresso, plus courte et plus intense, pour les vrais connaisseurs.',
        price: 2.30,
        stock: 110,
      },
      {
        label: 'Café au Lait Caramel',
        description: 'Café au lait sucré avec un délicieux sirop de caramel, parfait pour une pause gourmande.',
        price: 4.20,
        stock: 75,
      },
      {
        label: 'Flat White',
        description: 'Café d\'origine australienne, espresso double avec du lait micro-texturé, sans mousse excessive.',
        price: 3.70,
        stock: 65,
      },
      {
        label: 'Café Frappé',
        description: 'Boisson glacée à base de café instantané, eau froide, sucre et glaçons, battue jusqu\'à obtenir une mousse.',
        price: 3.40,
        stock: 95,
      },
      {
        label: 'Affogato Café',
        description: 'Dessert-café italien : une boule de glace à la vanille "noyée" dans un espresso chaud.',
        price: 5.00,
        stock: 45,
      },
      {
        label: 'Café Décaféiné',
        description: 'Espresso sans caféine conservant tout l\'arôme du café, idéal pour le soir ou les personnes sensibles à la caféine.',
        price: 2.60,
        stock: 130,
      },
      {
        label: 'Irish Coffee',
        description: 'Café chaud mélangé avec du whisky irlandais, du sucre brun et surmonté de crème fouettée.',
        price: 6.50,
        stock: 30,
      },
      {
        label: 'Café Turc Épicé',
        description: 'Café traditionnel turc finement moulu, préparé avec des épices comme la cardamome.',
        price: 3.90,
        stock: 55,
      },
      {
        label: 'Cortado Espagnol',
        description: 'Espresso coupé avec une petite quantité de lait chaud, équilibrant parfaitement amertume et douceur.',
        price: 3.30,
        stock: 85,
      },
      {
        label: 'Café Bombón',
        description: 'Spécialité espagnole : espresso servi avec du lait concentré sucré dans un verre transparent.',
        price: 3.60,
        stock: 70,
      },
      {
        label: 'Cold Brew Artisanal',
        description: 'Café infusé à froid pendant 12 heures, résultant en une boisson douce et peu acide.',
        price: 4.80,
        stock: 40,
      },
      {
        label: 'Café de Spécialité Single Origin',
        description: 'Grains d\'origine unique, torréfaction artisanale, notes complexes et profil aromatique distinct.',
        price: 5.50,
        stock: 25,
      },
    ];

    console.log('Seeding coffee products...');
    
    for (const productData of coffeeProducts) {
      const product = this.productRepository.create(productData);
      await this.productRepository.save(product);
    }

    console.log(`Successfully seeded ${coffeeProducts.length} coffee products!`);
  }

  async clearProducts() {
    console.log('Clearing all products...');
    await this.productRepository.clear();
    console.log('All products cleared!');
  }
}