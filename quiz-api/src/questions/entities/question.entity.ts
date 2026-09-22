import { Column, Entity, PrimaryGeneratedColumn, TableInheritance } from "typeorm";

@Entity('questions')
// STI: as 3 subclasses dividem esta tabela, question_type diz qual é cada linha
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

    // insert false deixa o DEFAULT SYSUTCDATETIME() do banco gravar garantindo UTC
    @Column({ type: 'datetime2', insert: false, update: false, name: 'created_at' })
    createdAt: Date;

}