import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
export declare class LeadsController {
    private readonly leadsService;
    constructor(leadsService: LeadsService);
    create(createLeadDto: CreateLeadDto): string;
    findAll(): string;
    findOne(id: string): string;
    update(id: string, updateLeadDto: UpdateLeadDto): string;
    remove(id: string): string;
}
