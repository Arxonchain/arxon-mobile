 import { useState } from 'react';
 import { motion, AnimatePresence } from 'framer-motion';
 import { Flame, Clock, CheckCircle, Search, TrendingUp } from 'lucide-react';
 import TournamentChallengeCard from './TournamentChallengeCard';
 import UpcomingChallengeRow from './UpcomingChallengeRow';
 import ArenaStatsBanner from './ArenaStatsBanner';
 import type { ArenaMarket, MarketVote } from '@/hooks/useArenaMarkets';
 
 type MarketFilter = 'live' | 'upcoming' | 'ended';
 
 interface ArenaTournamentExplorerProps {
   liveMarkets: ArenaMarket[];
   upcomingMarkets: ArenaMarket[];
   endedMarkets: ArenaMarket[];
   userPositions: Map<string, MarketVote>;
   onSelectMarket: (market: ArenaMarket) => void;
   loading?: boolean;
   teamStats: {
     alphaStaked: number;
     omegaStaked: number;
   };
 }
 
 const ArenaTournamentExplorer = ({
   liveMarkets,
   upcomingMarkets,
   endedMarkets,
   userPositions,
   onSelectMarket,
   loading = false,
   teamStats,
 }: ArenaTournamentExplorerProps) => {
   const [activeFilter, setActiveFilter] = useState<MarketFilter>('live');
   const [searchQuery, setSearchQuery] = useState('');
 
   const filters: { id: MarketFilter; label: string; icon: React.ElementType; count: number }[] = [
     { id: 'live', label: 'Live', icon: Flame, count: liveMarkets.length },
     { id: 'upcoming', label: 'Upcoming', icon: Clock, count: upcomingMarkets.length },
     { id: 'ended', label: 'Ended', icon: CheckCircle, count: endedMarkets.length },
   ];
 
   const getFilteredMarkets = () => {
     let markets: ArenaMarket[] = [];
     
     switch (activeFilter) {
       case 'live':
         markets = liveMarkets;
         break;
       case 'upcoming':
         markets = upcomingMarkets;
         break;
       case 'ended':
         markets = endedMarkets;
         break;
     }
 
     if (searchQuery) {
       markets = markets.filter(m => 
         m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
         m.side_a_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         m.side_b_name.toLowerCase().includes(searchQuery.toLowerCase())
       );
     }
 
     return markets;
   };
 
   const filteredMarkets = getFilteredMarkets();
   const totalStaked = liveMarkets.reduce((sum, m) => sum + m.side_a_power + m.side_b_power, 0);
   const totalChallenges = liveMarkets.length + upcomingMarkets.length + endedMarkets.length;
 
   return (
     <div className="space-y-4 pb-4">
       {/* Stats Banner */}
       <ArenaStatsBanner
         totalChallenges={totalChallenges}
         totalEarned={totalStaked}
         alphaEarned={teamStats.alphaStaked}
         omegaEarned={teamStats.omegaStaked}
       />
 
       {/* Search Bar */}
       <div className="px-4">
         <div className="relative">
           <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 rounded-xl blur-xl opacity-50 pointer-events-none" />
           <div className="relative">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
             <input
               type="text"
               placeholder="Search challenges..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full pl-10 pr-4 py-3 text-sm bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
             />
           </div>
         </div>
       </div>
 
       {/* Filter Tabs */}
       <div className="px-4">
         <div className="flex gap-2 p-1 bg-card/50 rounded-xl border border-border/30">
           {filters.map((filter) => (
             <button
               key={filter.id}
               onClick={() => setActiveFilter(filter.id)}
               className={`
                 flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg font-bold text-xs transition-all duration-300
                 ${activeFilter === filter.id
                   ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
                   : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}
               `}
             >
               <filter.icon className={`w-3.5 h-3.5 ${
                 activeFilter === filter.id 
                   ? 'text-primary-foreground' 
                   : filter.id === 'live' ? 'text-green-400' : ''
               }`} />
               <span>{filter.label}</span>
               <span className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                 activeFilter === filter.id
                   ? 'bg-primary-foreground/20'
                   : 'bg-muted/50'
               }`}>
                 {filter.count}
               </span>
             </button>
           ))}
         </div>
       </div>
 
       {/* Section Header */}
       <div className="px-4 flex items-center justify-between">
         <div>
           <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
             {activeFilter === 'live' ? 'Active Challenges' : activeFilter === 'upcoming' ? 'Starting Soon' : 'Past Challenges'}
           </p>
           <h2 className="text-lg font-black text-foreground">
             {activeFilter === 'live' ? 'STAKE NOW' : activeFilter === 'upcoming' ? 'COMING UP' : 'RESULTS'}
           </h2>
         </div>
         {filteredMarkets.length > 0 && (
           <span className="text-xs text-muted-foreground">
             {filteredMarkets.length} {filteredMarkets.length === 1 ? 'challenge' : 'challenges'}
           </span>
         )}
       </div>
 
       {/* Markets List */}
       <div className="px-4 space-y-3">
         <AnimatePresence mode="popLayout">
           {loading ? (
             <div className="space-y-3">
               {[1, 2, 3].map((i) => (
                 <motion.div 
                   key={i} 
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   className="h-48 rounded-2xl bg-gradient-to-br from-secondary/30 to-secondary/10 animate-pulse border border-border/20" 
                 />
               ))}
             </div>
           ) : filteredMarkets.length === 0 ? (
             <motion.div
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               className="py-16 text-center"
             >
               <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-muted/20 flex items-center justify-center">
                 <TrendingUp className="w-10 h-10 text-muted-foreground/40" />
               </div>
               <p className="text-lg font-bold text-muted-foreground mb-1">
                 {searchQuery ? 'No matches found' : `No ${activeFilter} challenges`}
               </p>
               <p className="text-sm text-muted-foreground/60">
                 {searchQuery ? 'Try a different search' : 'Check back soon!'}
               </p>
             </motion.div>
           ) : activeFilter === 'upcoming' ? (
             // Upcoming markets use row format
             filteredMarkets.map((market, index) => (
               <motion.div
                 key={market.id}
                 layout
                 initial={{ opacity: 0, x: -20 }}
                 animate={{ opacity: 1, x: 0 }}
                 exit={{ opacity: 0, x: 20 }}
                 transition={{ delay: index * 0.05 }}
               >
                 <UpcomingChallengeRow
                   market={market}
                   onClick={() => onSelectMarket(market)}
                 />
               </motion.div>
             ))
           ) : (
             // Live and ended markets use card format
             filteredMarkets.map((market, index) => (
               <motion.div
                 key={market.id}
                 layout
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 transition={{ delay: index * 0.05 }}
               >
                 <TournamentChallengeCard
                   market={market}
                   userPosition={userPositions.get(market.id)}
                   onClick={() => onSelectMarket(market)}
                   isLive={activeFilter === 'live'}
                 />
               </motion.div>
             ))
           )}
         </AnimatePresence>
       </div>
     </div>
   );
 };
 
 export default ArenaTournamentExplorer;