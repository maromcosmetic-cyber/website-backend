import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
export declare class LeadsService {
    create(createLeadDto: CreateLeadDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateLeadDto: UpdateLeadDto): string;
    remove(id: number): string;
}
