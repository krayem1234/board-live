import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { IsEmail, IsString, MinLength } from 'class-validator'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { BoardsService } from './boards.service'

class CreateBoardDto {
  @IsString() @MinLength(1) title: string
}
class AddMemberDto {
  @IsEmail() email: string
}
class RenameBoardDto {
  @IsString() @MinLength(1) title: string
}

@UseGuards(JwtAuthGuard)
@Controller('boards')
export class BoardsController {
  constructor(private boards: BoardsService) {}

  @Get()
  mine(@Req() req: any) {
    return this.boards.myBoards(req.user.sub)
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateBoardDto) {
    return this.boards.createBoard(req.user.sub, dto.title)
  }

  @Get(':id')
  get(@Req() req: any, @Param('id') id: string) {
    return this.boards.getBoard(req.user.sub, id)
  }

  @Patch(':id')
  rename(@Req() req: any, @Param('id') id: string, @Body() dto: RenameBoardDto) {
    return this.boards.renameBoard(req.user.sub, id, dto.title)
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.boards.deleteBoard(req.user.sub, id)
  }

  @Post(':id/members')
  addMember(@Req() req: any, @Param('id') id: string, @Body() dto: AddMemberDto) {
    return this.boards.addMember(req.user.sub, id, dto.email)
  }

  @Delete(':id/members/:userId')
  removeMember(@Req() req: any, @Param('id') id: string, @Param('userId') userId: string) {
    return this.boards.removeMember(req.user.sub, id, userId)
  }
}
