import { Schema, Prop, SchemaFactory} from '@nestjs/mongoose'

@Schema({timestamps: false})
export class Items {
    @Prop({ required:true, unique:true, index: true})
    objectId: string;

    @Prop({required:true})
    title: string;

    @Prop({required:false})
    url: string;

    @Prop({required:true})
    author: string;

    @Prop({required:true, index:true})
    createdAt: Date;

    @Prop({default:false, required:true, index:true})
    isDeleted: boolean;
}

export const ItemsSchema = SchemaFactory.createForClass(Items)