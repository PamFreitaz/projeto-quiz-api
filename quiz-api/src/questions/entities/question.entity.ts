import { Column, Entity, PrimaryGeneratedColumn, TableInheritance } from "typeorm";

@Entity('questions')
@TableInheritance({ column: { type: 'nvarchar', name: 'question_type' } })
export abstract class Question {

    @PrimaryGeneratedColumn('uuid')
    id: string;
    
    @Column({ type: 'nvarchar', length: 'MAX' })
    statement: string;

    @Column({ type: 'decimal', precision: 6, scale: 2, name: 'weight_points',
        transformer: {
        to: (value: number) => value,
        from: (value: string) => Number(value)
        }
    })
    weightPoints: number;

    @Column({ type: 'datetime2', insert: false, update: false, name: 'created_at' })
    createdAt: Date;

}