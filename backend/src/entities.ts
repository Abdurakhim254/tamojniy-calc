import { Column, Entity, Index, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class TnvedCode {
  @PrimaryColumn() code!: string;
  @Column() display!: string;
  @Column({ type: 'text', nullable: true }) unit!: string | null;
  @Column('text') description!: string;
  @Column('text') searchText!: string;
  @Index() @Column() heading!: string;
}

@Entity()
export class Rate {
  @PrimaryColumn() code!: string;
  @Column({ type: 'float', nullable: true }) dutyPercent!: number | null;
  @Column({ type: 'float', nullable: true }) dutySpecific!: number | null;
  @Column({ type: 'text', nullable: true }) dutyCurrency!: string | null;
  @Column({ type: 'float', nullable: true }) excisePercent!: number | null;
  @Column({ type: 'float', nullable: true }) exciseSpecific!: number | null;
  @Column({ type: 'text', nullable: true }) exciseCurrency!: string | null;
  @Column({ type: 'float', nullable: true }) vatPercent!: number | null;
  @Column({ type: 'float', nullable: true }) utilFee!: number | null;
  @Column({ type: 'text', nullable: true }) note!: string | null;
}

@Entity()
export class Preference {
  @PrimaryGeneratedColumn() id!: number;
  @Column() name!: string;
  @Column({ type: 'text', nullable: true }) nameEn!: string | null;
  @Column({ type: 'text', nullable: true }) nameUz!: string | null;
  @Column('simple-json') prefixes!: string[];
  @Column('simple-json') exceptPrefixes!: string[];
  @Column('float') dutyPercent!: number;
  @Column() validFrom!: string;
  @Column() validTo!: string;
  @Column() source!: string;
}

@Entity()
export class Country {
  @PrimaryColumn() iso!: string;
  @Column() name!: string;
  @Column() regime!: string;
  @Column({ default: false }) goodsListOnly!: boolean;
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
  @Column({ default: 'other' }) kind!: string;
}

@Entity()
export class Setting {
  @PrimaryColumn() key!: string;
  @Column() value!: string;
}
