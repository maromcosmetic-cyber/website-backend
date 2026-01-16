import { CreateBundleDto } from './dto/create-bundle.dto';
import { UpdateBundleDto } from './dto/update-bundle.dto';
export declare class BundlesService {
    create(createBundleDto: CreateBundleDto): string;
    findAll(): string;
    findOne(id: number): string;
    update(id: number, updateBundleDto: UpdateBundleDto): string;
    remove(id: number): string;
}
