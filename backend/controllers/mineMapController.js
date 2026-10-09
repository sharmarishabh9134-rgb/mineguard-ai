import mongoose from 'mongoose';
import MineMap from '../models/MineMap.js';

const escapeRegex=value=>String(value||'').replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const authorizedScope=req=>req.user.role==='admin'?{}:{mineId:{$regex:`^${escapeRegex(req.user.assignedMineLocation)}(?:\\s|$)`,$options:'i'}};
const validMap=(map)=>typeof map.name==='string'&&map.name.trim().length>0&&map.name.length<=160&&Array.isArray(map.zones)&&map.zones.length<=100&&map.zones.every(z=>z.zoneId&&z.name&&['SAFE','RESTRICTED','DANGER','EMERGENCY_EXIT'].includes(z.type)&&Number.isFinite(z.coordinates?.x)&&z.coordinates.x>=0&&z.coordinates.x<=100&&Number.isFinite(z.coordinates?.y)&&z.coordinates.y>=0&&z.coordinates.y<=100);

export const listSupervisorMaps=async(req,res)=>{
  if(mongoose.connection.readyState!==1)return res.status(503).json({success:false,message:'Mine maps cannot be loaded because MongoDB is not connected.'});
  const maps=await MineMap.find(authorizedScope(req)).select('mineId name mapUrl boundaries zones updatedAt').sort({name:1}).lean();
  return res.json({success:true,maps,mineScope:req.user.role==='admin'?null:req.user.assignedMineLocation});
};

export const saveSupervisorMap=async(req,res)=>{
  if(mongoose.connection.readyState!==1)return res.status(503).json({success:false,message:'Mine maps cannot be saved because MongoDB is not connected.'});
  const mineId=req.user.role==='admin'?String(req.body.mineId||'').trim():String(req.user.assignedMineLocation||'').trim();
  const {name,zones=[],boundaries}=req.body;
  if(!mineId||!validMap({name,zones}))return res.status(400).json({success:false,message:'Map name and valid zone positions (0–100) are required.'});
  const zoneIds=zones.map(z=>String(z.zoneId).trim().toLowerCase());
  if(new Set(zoneIds).size!==zoneIds.length)return res.status(400).json({success:false,message:'Zone IDs must be unique within this map.'});
  if(req.params.id){
    const map=await MineMap.findOne({_id:req.params.id,...authorizedScope(req)});
    if(!map)return res.status(404).json({success:false,message:'Mine map not found in your authorized scope.'});
    map.name=name.trim();map.zones=zones;map.boundaries=boundaries||map.boundaries;await map.save();return res.json({success:true,map});
  }
  const existing=await MineMap.findOne({mineId});
  if(existing){existing.name=name.trim();existing.zones=zones;existing.boundaries=boundaries||existing.boundaries;await existing.save();return res.json({success:true,map:existing,updated:true});}
  const map=await MineMap.create({mineId,name:name.trim(),zones,boundaries});
  return res.status(201).json({success:true,map});
};
