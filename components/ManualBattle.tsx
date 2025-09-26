import React, { useLayoutEffect, useRef, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { Unit, UnitType } from '../types';
import { UNIT_DEFINITIONS } from '../constants';
import { PauseIcon, PlayIcon, FastForwardIcon, SpeedUpIcon } from './Icons';

declare const p5: any;

type BattleSpeed = 'pause' | 'slow' | 'normal' | 'fast';

interface ManualBattleProps {
  battleInfo: {
    attackerId: string;
    defenderId: string;
    defenderType: 'army' | 'city';
  };
  onBattleComplete: () => void;
}

const ManualBattle: React.FC<ManualBattleProps> = ({ battleInfo, onBattleComplete }) => {
    const sketchRef = useRef<HTMLDivElement>(null);
    const p5InstanceRef = useRef<any>(null);
    const [activeSpeed, setActiveSpeed] = useState<BattleSpeed>('normal');
    const gameState = useGameStore(state => state.gameState)!;

    const handleSpeedChange = (speed: BattleSpeed) => {
        setActiveSpeed(speed);
        const p5Instance = p5InstanceRef.current;
        if (!p5Instance) return;

        switch (speed) {
            case 'pause':
                p5Instance.noLoop();
                break;
            case 'slow':
                p5Instance.frameRate(15);
                p5Instance.loop();
                break;
            case 'normal':
                p5Instance.frameRate(30);
                p5Instance.loop();
                break;
            case 'fast':
                p5Instance.frameRate(60);
                p5Instance.loop();
                break;
        }
    };

    useLayoutEffect(() => {
        let p5Instance: any;

        const sketch = (p: any) => {
            let attackerSoldiers: Soldier[] = [];
            let defenderSoldiers: Soldier[] = [];
            let allSoldiers: Soldier[] = [];
            let battleEnded = false;

            class Soldier {
                pos: any;
                vel: any;
                hp: number;
                maxHp: number;
                attack: number;
                defense: number;
                morale: number;
                maxMorale: number;
                isAlive: boolean;
                isFleeing: boolean;
                color: any;
                team: 'attacker' | 'defender';
                target: Soldier | null = null;
                attackCooldown: number = 0;
                unitType: UnitType;
                hasRangedAttack: boolean;
                rangedAttack: number;
                rangedAttackRange: number;
                projectile: { target: any, frames: number } | null = null;


                constructor(x: number, y: number, unit: Unit, team: 'attacker' | 'defender') {
                    this.pos = p.createVector(x, y);
                    this.vel = p.createVector(p.random(-1, 1), p.random(-1, 1));
                    const unitDef = UNIT_DEFINITIONS[unit.type];
                    this.hp = unit.hp;
                    this.maxHp = unitDef.maxHp;
                    this.attack = unitDef.attack;
                    this.defense = unitDef.defense;
                    this.isAlive = true;
                    this.isFleeing = false;
                    this.team = team;
                    this.color = team === 'attacker' ? p.color(255) : p.color(0); // White for attacker, Black for defender
                    this.unitType = unit.type;

                    this.maxMorale = unitDef.maxMorale;
                    this.morale = unit.morale ?? this.maxMorale;

                    this.hasRangedAttack = unitDef.hasRangedAttack ?? false;
                    this.rangedAttack = unitDef.rangedAttack ?? 0;
                    this.rangedAttackRange = (unitDef.rangedAttackRange ?? 0) * 50; // Scale range
                }

                findTarget(enemies: Soldier[]) {
                    if (this.target && this.target.isAlive && !this.target.isFleeing) return;

                    let closestDist = Infinity;
                    let closestEnemy: Soldier | null = null;
                    for (const enemy of enemies) {
                        if (enemy.isAlive && !enemy.isFleeing) {
                            const d = this.pos.dist(enemy.pos);
                            if (d < closestDist) {
                                closestDist = d;
                                closestEnemy = enemy;
                            }
                        }
                    }
                    this.target = closestEnemy;
                }
                
                update(enemies: Soldier[], allies: Soldier[]) {
                    if (!this.isAlive) return;

                    // Fleeing logic takes precedence
                    if (this.isFleeing) {
                        const fleeDestination = this.team === 'attacker' ? p.createVector(0, this.pos.y) : p.createVector(p.width, this.pos.y);
                        const desired = p5.Vector.sub(fleeDestination, this.pos);
                        desired.setMag(2.5);
                        const steer = p5.Vector.sub(desired, this.vel);
                        steer.limit(0.3);
                        this.vel.add(steer);
                        this.pos.add(this.vel);
                        return;
                    }

                    // Morale checks
                    if (p.frameCount % 60 === 0) { // Every second
                        const alliesAlive = allies.filter(s => s.isAlive && !s.isFleeing).length;
                        const enemiesAlive = enemies.filter(s => s.isAlive && !s.isFleeing).length;
                        if (alliesAlive < enemiesAlive * 0.7) {
                            this.morale -= 0.5;
                        }
                    }

                    if (this.morale <= 0) {
                        this.isFleeing = true;
                        this.target = null;
                        return;
                    }

                    if (!this.target) return;

                    const targetPos = this.target.pos;
                    const desired = p5.Vector.sub(targetPos, this.pos);
                    const dist = desired.mag();

                    // Ranged Attack Logic
                    if (this.hasRangedAttack && dist < this.rangedAttackRange && this.attackCooldown <= 0) {
                        this.vel.mult(0.1); // Stop to shoot
                        if (p.random() < 0.8) { // 80% hit chance for ranged
                            const rawDamage = p.random(this.rangedAttack * 0.8, this.rangedAttack * 1.2);
                            const damageMultiplier = 100 / (100 + this.target.defense);
                            const finalDamage = rawDamage * damageMultiplier;
                            
                            this.target.hp -= finalDamage;
                            this.target.morale -= 1; // Less morale damage for ranged
                            this.projectile = { target: this.target.pos.copy(), frames: 10 };

                            if (this.target.hp <= 0) {
                                this.target.isAlive = false;
                                const fallenTeam = this.target.team === 'attacker' ? attackerSoldiers : defenderSoldiers;
                                for (const ally of fallenTeam) {
                                    if (ally.isAlive && ally.pos.dist(this.target.pos) < 80) {
                                        ally.morale -= 5;
                                    }
                                }
                                this.target = null;
                            }
                        }
                        this.attackCooldown = 60; // 1 sec cooldown for ranged
                    } 
                    // Melee Attack Logic
                    else if (dist < 15) { 
                        this.vel.mult(0.5); 
                        if (this.attackCooldown <= 0) {
                            if (p.random() < 0.9) { 
                                const rawDamage = p.random(this.attack * 0.8, this.attack * 1.2);
                                const damageMultiplier = 100 / (100 + this.target.defense);
                                const finalDamage = rawDamage * damageMultiplier;
                                
                                this.target.hp -= finalDamage;
                                this.target.morale -= 2;

                                if (this.target.hp <= 0) {
                                    this.target.isAlive = false;
                                    const fallenTeam = this.target.team === 'attacker' ? attackerSoldiers : defenderSoldiers;
                                    for (const ally of fallenTeam) {
                                        if (ally.isAlive && ally.pos.dist(this.target.pos) < 80) {
                                            ally.morale -= 5;
                                        }
                                    }
                                    this.target = null;
                                }
                            }
                            this.attackCooldown = 30; // 0.5 sec cooldown
                        }
                    } 
                    // Movement Logic
                    else {
                        desired.setMag(1.5); // speed
                        const steer = p5.Vector.sub(desired, this.vel);
                        steer.limit(0.2); // steering force
                        this.vel.add(steer);
                    }
                    
                    this.vel.limit(2);
                    this.pos.add(this.vel);
                    this.attackCooldown = Math.max(0, this.attackCooldown - 1);
                }

                display() {
                    if (!this.isAlive) {
                        p.fill(120, 0, 0, 150);
                        p.noStroke();
                        p.ellipse(this.pos.x, this.pos.y, 8, 8);
                        return;
                    }
                    
                    const barWidth = 15;
                    const barHeight = 3;
                    const barX = this.pos.x - barWidth / 2;

                    const healthPercentage = Math.max(0, this.hp / this.maxHp);
                    const healthY = this.pos.y - 12;
                    p.noStroke();
                    p.fill(50, 200);
                    p.rect(barX, healthY, barWidth, barHeight);
                    if (healthPercentage > 0.5) p.fill(0, 255, 0);
                    else if (healthPercentage > 0.25) p.fill(255, 255, 0);
                    else p.fill(255, 0, 0);
                    p.rect(barX, healthY, barWidth * healthPercentage, barHeight);

                    const moralePercentage = Math.max(0, this.morale / this.maxMorale);
                    const moraleY = healthY + barHeight + 1;
                    p.noStroke();
                    p.fill(50, 200);
                    p.rect(barX, moraleY, barWidth, barHeight);
                    p.fill(0, 200, 255);
                    p.rect(barX, moraleY, barWidth * moralePercentage, barHeight);

                    if (this.isFleeing) p.fill(150);
                    else p.fill(this.color);
                    
                    p.stroke(this.team === 'attacker' ? 0 : 255);
                    p.strokeWeight(1);
                    p.ellipse(this.pos.x, this.pos.y, 8, 8);
                    
                    if (this.projectile) {
                        p.stroke(255, 255, 0, 200); // Yellowish projectile
                        p.strokeWeight(2);
                        p.line(this.pos.x, this.pos.y, this.projectile.target.x, this.projectile.target.y);
                        this.projectile.frames--;
                        if (this.projectile.frames <= 0) {
                            this.projectile = null;
                        }
                    }
                }
            }
            
            p.setup = () => {
                p.createCanvas(sketchRef.current!.clientWidth, sketchRef.current!.clientHeight);
                p.frameRate(30);
                const attackerArmy = gameState.armies.get(battleInfo.attackerId)!;
                const defenderEntity = battleInfo.defenderType === 'army' 
                    ? gameState.armies.get(battleInfo.defenderId)!
                    : gameState.cities.get(battleInfo.defenderId)!;
                
                const attackerUnits = attackerArmy.unitIds.map(id => gameState.units.get(id)!);
                const defenderUnits = ('unitIds' in defenderEntity ? defenderEntity.unitIds : defenderEntity.garrison).map(id => gameState.units.get(id)!);
                
                attackerUnits.forEach(unit => {
                    const x = p.random(p.width * 0.1, p.width * 0.2);
                    const y = p.random(p.height * 0.1, p.height * 0.9);
                    attackerSoldiers.push(new Soldier(x, y, unit, 'attacker'));
                });
                
                defenderUnits.forEach(unit => {
                    const x = p.random(p.width * 0.8, p.width * 0.9);
                    const y = p.random(p.height * 0.1, p.height * 0.9);
                    defenderSoldiers.push(new Soldier(x, y, unit, 'defender'));
                });

                allSoldiers = [...attackerSoldiers, ...defenderSoldiers];
            };

            p.draw = () => {
                p.background(34, 139, 34);

                allSoldiers.filter(s => !s.isAlive).forEach(s => s.display());

                attackerSoldiers.filter(s => s.isAlive).forEach(s => {
                    s.findTarget(defenderSoldiers);
                    s.update(defenderSoldiers, attackerSoldiers);
                    s.display();
                });
                defenderSoldiers.filter(s => s.isAlive).forEach(s => {
                    s.findTarget(attackerSoldiers);
                    s.update(attackerSoldiers, defenderSoldiers);
                    s.display();
                });
                
                if (battleEnded) return;

                const attackersRemaining = attackerSoldiers.some(s => s.isAlive && !s.isFleeing);
                const defendersRemaining = defenderSoldiers.some(s => s.isAlive && !s.isFleeing);

                if (!attackersRemaining || !defendersRemaining) {
                    battleEnded = true;
                    p.noLoop();
                    setTimeout(() => {
                        onBattleComplete();
                    }, 2000);
                }
            };

            p.windowResized = () => {
                if (sketchRef.current) {
                    p.resizeCanvas(sketchRef.current.clientWidth, sketchRef.current.clientHeight);
                }
            };
        };

        if (sketchRef.current) {
            p5Instance = new p5(sketch, sketchRef.current);
            p5InstanceRef.current = p5Instance;
        }

        return () => {
            if (p5Instance) {
                p5Instance.remove();
            }
        };
    }, [battleInfo, gameState, onBattleComplete]);

    const speedControls: { name: BattleSpeed; icon: React.ReactNode; label: string }[] = [
        { name: 'pause', icon: <PauseIcon className="w-5 h-5" />, label: 'Pauze' },
        { name: 'slow', icon: <PlayIcon className="w-5 h-5" />, label: 'Slowmotion' },
        { name: 'normal', icon: <FastForwardIcon className="w-5 h-5" />, label: 'Normal' },
        { name: 'fast', icon: <SpeedUpIcon className="w-5 h-5" />, label: 'Speedup' },
    ];

    return (
        <div className="absolute inset-0 bg-gray-900 z-50 animate-fade-in" aria-modal="true" role="dialog">
            <div ref={sketchRef} className="w-full h-full"></div>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2">
                <div className="flex items-center gap-2 bg-gray-900/70 backdrop-blur-sm p-2 rounded-xl border border-gray-600 shadow-lg">
                    {speedControls.map(control => (
                        <button
                            key={control.name}
                            onClick={() => handleSpeedChange(control.name)}
                            className={`px-4 py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-semibold transition-colors ${
                                activeSpeed === control.name
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-700/50 text-gray-300 hover:bg-gray-600'
                            }`}
                            title={control.label}
                        >
                            {control.icon}
                            <span className="hidden sm:inline">{control.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ManualBattle;