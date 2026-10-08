import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class TnvedCode {
  @PrimaryColumn() code!: string; // 10 цифр без пробелов
  @Column() display!: string; // 0101 21 000 0
  @Column({ type: 'text', nullable: true }) unit!: string | null;
  @Column('text') description!: string;
  @Column('text') searchText!: string; // нижний регистр, считается в коде — поиск не зависит от локали БД
  @Index() @Column() heading!: string; // первые 4 цифры
}

/** Ставки. code может быть 2..10 цифр — ищется самый длинный подходящий префикс. */
@Entity()
export class Rate {
  @PrimaryColumn() code!: string;
  @Column({ type: 'float', nullable: true }) dutyPercent!: number | null;
  @Column({ type: 'float', nullable: true }) dutySpecific!: number | null; // за единицу измерения
  @Column({ type: 'text', nullable: true }) dutyCurrency!: string | null;
  @Column({ type: 'float', nullable: true }) excisePercent!: number | null;
  @Column({ type: 'float', nullable: true }) exciseSpecific!: number | null;
  @Column({ type: 'text', nullable: true }) exciseCurrency!: string | null;
  @Column({ type: 'float', nullable: true }) vatPercent!: number | null; // null => общая ставка НДС
  @Column({ type: 'float', nullable: true }) utilFee!: number | null; // утильсбор, сум
  @Column({ type: 'text', nullable: true }) note!: string | null;
}

/** Временные льготы (напр. УП-145: нулевая пошлина на ряд товаров). */
@Entity()
export class Preference {
  @PrimaryGeneratedColumn() id!: number;
  @Column() name!: string; // ru
  @Column({ type: 'text', nullable: true }) nameEn!: string | null;
  @Column({ type: 'text', nullable: true }) nameUz!: string | null;
  @Column('simple-json') prefixes!: string[];
  @Column('simple-json') exceptPrefixes!: string[];
  @Column('float') dutyPercent!: number;
  @Column() validFrom!: string; // YYYY-MM-DD, включительно
  @Column() validTo!: string; // YYYY-MM-DD, не включительно
  @Column() source!: string;
}

@Entity()
export class Country {
  @PrimaryColumn() iso!: string;
  @Column() name!: string;
  @Column() regime!: string; // 'ZST' | 'MFN'
  @Column({ default: false }) goodsListOnly!: boolean; // TM, SG: льгота только на перечень товаров
}

@Entity()
export class CountryGoods {
  @PrimaryGeneratedColumn() id!: number;
  @Index() @Column() iso!: string;
  @Column() codePrefix!: string;
}

@Entity()
export class DocumentReq {
  @PrimaryGeneratedColumn() id!: number;
  @Index() @Column() codePrefix!: string;
  @Column() title!: string;
  @Column({ default: 'other' }) kind!: string; // certificate | license | benefit | other
}

@Entity()
export class Setting {
  @PrimaryColumn() key!: string;
  @Column() value!: string;
}
